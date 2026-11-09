import { createHash } from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import {
  BUNDLE_FILE,
  Compatibility,
  IndexEntry,
  Manifest,
  Platform,
  PlatformIndex,
  ROOT_INDEX_KEY,
  RootIndex,
  SCHEMA,
  compatibilityKey,
  fileKey,
  manifestKey,
  platformIndexKey,
  previewInfo,
} from "../../utils/previews/layout.util";
import {
  S3Config,
  deleteObject,
  exists,
  getJson,
  listKeys,
  objectUrl,
  putObject,
} from "../s3/s3.service";
import { previewTitle } from "../../utils/previews/preview-title.util";
import { forEachAtOnce } from "../../utils/s3/for-each-at-once.util";
import { buildBundle } from "./bundle.service";
import { prepareCopy, removeInBackground } from "./copy.service";
import { buildFileSets, readFileSets } from "./file-sets.service";
import { shortChangelog } from "../../utils/publish/changelog.util";
import {
  indexesListing,
  removePreview,
  syncRootVersion,
  upsertPreview,
} from "../../utils/publish/indexes.util";
import {
  AppConfig,
  appVersionOf,
  buildNumberOf,
  fileSetsOf,
} from "../../utils/config/expo-config.util";
import { fingerprint } from "../cli/project.service";

type Env = NodeJS.ProcessEnv;
const log = (message: string) => process.stdout.write(`${message}\n`);
const mb = (bytes: number) => (bytes / 1e6).toFixed(1);
// Without a terminal (CI), one progress line per this many finished files.
const PROGRESS_EVERY = 20;
// Each file is a HEAD and often a PUT, and over a slow link most of that is waiting on the
// server, so a small file took as long as a big one when they went one at a time.
const UPLOADS_AT_ONCE = 4;

/**
 * Read, change, write back only if nobody else wrote in between (the ETag still matches), and
 * start over when someone did. This is what keeps two publishes at once from losing an entry.
 */
async function updateJson<T>(
  s3: S3Config,
  key: string,
  change: (current: T | null) => T,
  attempts = 8,
): Promise<T> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const current = await getJson<T>(s3, key);
    const next = change(current?.data ?? null);
    const written = await putObject(s3, key, JSON.stringify(next, null, 2), {
      contentType: "application/json",
      etag: current?.etag ?? null,
    });
    if (written) return next;
    await new Promise((r) =>
      setTimeout(r, 100 * attempt + Math.random() * 200),
    );
  }
  throw new Error(`Gave up writing ${key}: it kept changing under us`);
}

export type PublishOptions = {
  projectRoot: string;
  config: AppConfig;
  compatibility: Compatibility;
  s3: S3Config;
  platforms: Platform[];
  id: string;
  title?: string;
  branch: string;
  commit: string;
  author: string;
  changelog: string;
  entryFile?: string;
  /** The EAS environment the bundle was built with, recorded for the app to show. */
  environment?: string;
  /** The run's temp folder. Each platform's copy and export go in it. */
  work: string;
  /** Build in the project folder itself, with no copy. */
  inPlace?: boolean;
  /** Leave each copy in `work` after the publish, to look inside. */
  keepCopy?: boolean;
};

export async function publish(options: PublishOptions) {
  const { s3, id, projectRoot, work } = options;
  const title = options.title || previewTitle(id);
  const publishedAt = new Date().toISOString();
  const folders = fileSetsOf(options.config);
  // Before the bundle, so a missing folder stops the publish early.
  const fileSets = (root: string, env: Env) => {
    buildFileSets(root, folders, env);
    const sets = readFileSets(root, folders, !options.inPlace);
    for (const [name, set] of Object.entries(sets.fileSets ?? {}))
      log(`files ${name}: ${set.files} files from ${folders[name].folder}`);
    return sets;
  };
  // In place, both platforms get the same files, built once.
  let inPlaceSets: ReturnType<typeof readFileSets> | undefined;

  /** The copy and its install, the file sets and the export: everything that runs before upload. */
  const build = (platform: Platform, copy: string) => {
    try {
      let root = projectRoot;
      let env: Env = { ...process.env, PREVIEW_PUBLISH: "1" };
      if (options.inPlace) inPlaceSets ??= fileSets(root, env);
      else
        ({ appDir: root, env } = prepareCopy({
          projectRoot,
          dest: copy,
          platform,
        }));
      const sets = inPlaceSets ?? fileSets(root, env);
      log(`\n${platform}: building ${id}`);
      const bundle = buildBundle(root, platform, {
        // Given from the project root, so it moves to the same place in the copy.
        entryFile:
          options.entryFile &&
          join(
            root,
            relative(projectRoot, resolve(projectRoot, options.entryFile)),
          ),
        outDir: join(work, `${platform}-out`),
        env,
      });
      return { sets, ...bundle };
    } catch (error) {
      if (!options.inPlace && !options.keepCopy && error instanceof Error)
        error.message +=
          "\nRun again with --keep-copy to look inside the copy.";
      throw error;
    }
  };

  for (const platform of options.platforms) {
    const copy = join(work, platform);
    let published = false;
    try {
      const { sets, files: bundleFiles, hermesVersion } = build(platform, copy);
      // Uploaded, downloaded, checked and counted in the revision like any bundle file.
      const files = [...bundleFiles, ...sets.files];
      // From the user's folder, as eas-cli does it, never from the copy.
      const fp = await fingerprint(projectRoot, platform);
      const version = appVersionOf(options.config, platform);
      const key = compatibilityKey(
        options.compatibility,
        options.compatibility === "appVersion" ? version : fp,
      );

      const total = files.reduce((sum, f) => sum + f.size, 0);
      const tty = process.stdout.isTTY;
      let uploaded = 0;
      let finished = 0;
      let done = 0;
      let latest = "";
      const progress = () =>
        `${platform}: uploading ${finished}/${files.length} (${mb(done)}/${mb(total)} MB) ${latest}`;
      const redraw = () => {
        // Cut to the terminal's width: a line that wraps can't be redrawn in place.
        if (tty)
          process.stdout.write(
            `\r\x1b[K${progress().slice(0, (process.stdout.columns || 80) - 1)}`,
          );
      };
      try {
        await forEachAtOnce(files, UPLOADS_AT_ONCE, async (file) => {
          latest = file.path;
          redraw();
          if (!(await exists(s3, fileKey(file.sha256)))) {
            await putObject(
              s3,
              fileKey(file.sha256),
              readFileSync(file.absolutePath),
            );
            uploaded++;
          }
          finished++;
          done += file.size;
          redraw();
          if (!tty && finished % PROGRESS_EVERY === 0) log(progress());
        });
      } catch (error) {
        // Keep the last line, so the error printed under it shows how far it got.
        if (tty) process.stdout.write("\n");
        throw error;
      }
      if (tty) process.stdout.write("\r\x1b[K");
      log(
        `${platform}: ${files.length} files, ${uploaded} new, ${files.length - uploaded} already in the bucket`,
      );

      const info = previewInfo(
        {
          id,
          title,
          branch: options.branch,
          commit: options.commit,
          author: options.author,
          publishedAt,
          appVersion: version,
          buildNumber: buildNumberOf(options.config, platform),
          compatibility: options.compatibility,
          fingerprint: fp,
          ...(sets.fileSets && { fileSets: sets.fileSets }),
        },
        options.environment,
      );
      const manifest: Manifest = {
        schema: SCHEMA,
        ...info,
        platform,
        key,
        bundle: BUNDLE_FILE[platform],
        hermesVersion,
        changelog: options.changelog,
        files: files.map(({ path, sha256, size }) => ({ path, sha256, size })),
      };
      const manifestPath = manifestKey(platform, key, id);
      await putObject(s3, manifestPath, JSON.stringify(manifest, null, 2), {
        contentType: "application/json",
      });

      const entry: IndexEntry = {
        ...info,
        revision: createHash("sha256")
          .update(
            manifest.files
              .map((f) => `${f.path}:${f.sha256}`)
              .sort()
              .join("\n"),
          )
          .digest("hex")
          .slice(0, 16),
        size: total,
        changelog: shortChangelog(options.changelog),
        manifest: manifestPath,
      };
      // Last, so an app never sees an entry whose files are not all there yet.
      const index = await updateJson<PlatformIndex>(
        s3,
        platformIndexKey(platform, key),
        (current) =>
          upsertPreview(
            current,
            platform,
            { key, compatibility: options.compatibility },
            entry,
            publishedAt,
          ),
      );
      await updateJson<RootIndex>(s3, ROOT_INDEX_KEY, (root) =>
        syncRootVersion(root, index, publishedAt),
      );
      log(`${platform}: published ${id} for build ${key}`);
      log(`${platform}: ${objectUrl(s3, platformIndexKey(platform, key))}`);
      published = true;
    } finally {
      if (!options.inPlace && options.keepCopy)
        log(`${platform}: kept the copy at ${copy}`);
      else if (!options.inPlace && published) {
        removeInBackground(copy, `${work}-${platform}`);
        log(`${platform}: deleting the copy in the background`);
      } else if (!options.inPlace) {
        rmSync(copy, { recursive: true, force: true });
        log(`${platform}: removed the copy`);
      }
    }
  }
}

/** Removes the preview from every build's list. Its files stay until `prune`. */
export async function unpublish(s3: S3Config, id: string) {
  const root = await getJson<RootIndex>(s3, ROOT_INDEX_KEY);
  const keys = indexesListing(root?.data ?? null, id);
  if (keys.length === 0) {
    log(`${id} is not published`);
    return;
  }
  const now = new Date().toISOString();
  for (const key of keys) {
    const index = await updateJson<PlatformIndex>(s3, key, (current) => {
      if (!current)
        throw new Error(`${key} is listed in ${ROOT_INDEX_KEY} but missing`);
      return removePreview(current, id, now);
    });
    await deleteObject(s3, manifestKey(index.platform, index.key, id));
    await updateJson<RootIndex>(s3, ROOT_INDEX_KEY, (current) =>
      syncRootVersion(current, index, now),
    );
    log(`unpublished ${id} from ${key}`);
  }
}

/** Deletes every file that no manifest refers to. */
export async function prune(s3: S3Config) {
  const referenced = new Set<string>();
  for (const key of await listKeys(s3, "previews/")) {
    const manifest = await getJson<Manifest>(s3, key);
    manifest?.data.files.forEach((f) => referenced.add(fileKey(f.sha256)));
  }
  let removed = 0;
  for (const key of await listKeys(s3, "files/")) {
    if (referenced.has(key)) continue;
    await deleteObject(s3, key);
    removed++;
  }
  log(`pruned ${removed} files, kept ${referenced.size}`);
}
