#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { PLATFORMS, Platform } from "../core/layout";
import { prune, publish, unpublish } from "./commands";
import { readConfig } from "./config";
import { changelogSince, defaultBase, gitInfo } from "./project";

const HELP = `preview-ready <command> [options]

  publish            build this app's JS bundle and upload it as a preview
    --id <id>          preview id (default: the git branch)
    --title <title>    title QA sees (default: a readable form of the id)
    --platform <p>     android, ios or all (default: all)
    --base <branch>    branch the changelog counts from (default: the repo's default branch)
    --changelog=<text> changelog text instead of the commit subjects (use = when it starts
                       with a dash, as a "- item" list does)
    --changelog-file <path>
    --entry-file <path>
  unpublish <id>     remove a preview from every build's list
  prune              delete files no preview uses any more

  --project <dir>    the app's root, where .env lives (default: the current folder)

Bucket and write key come from .env or the environment: PREVIEW_READY_S3_ENDPOINT,
PREVIEW_READY_S3_BUCKET, PREVIEW_READY_S3_REGION, PREVIEW_READY_S3_ACCESS_KEY_ID,
PREVIEW_READY_S3_SECRET_ACCESS_KEY, and optionally PREVIEW_READY_S3_PUBLIC_URL.`;

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      id: { type: "string" },
      title: { type: "string" },
      platform: { type: "string", default: "all" },
      base: { type: "string" },
      changelog: { type: "string" },
      "changelog-file": { type: "string" },
      "entry-file": { type: "string" },
      project: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  const [command, arg] = positionals;
  if (values.help || !command) {
    process.stdout.write(`${HELP}\n`);
    return;
  }
  const projectRoot = resolve(values.project ?? process.cwd());
  const s3 = readConfig(projectRoot);

  if (command === "publish") {
    const git = gitInfo(projectRoot);
    const id = values.id ?? git.branch;
    if (!id || id === "HEAD")
      throw new Error("No git branch to name the preview after; pass --id.");
    const platforms =
      values.platform === "all" ? PLATFORMS : [values.platform as Platform];
    if (!platforms.every((p) => PLATFORMS.includes(p))) {
      throw new Error(`--platform must be android, ios or all`);
    }
    const changelog =
      values.changelog ??
      (values["changelog-file"]
        ? readFileSync(resolve(values["changelog-file"]), "utf8").trim()
        : changelogSince(projectRoot, values.base ?? defaultBase(projectRoot)));
    await publish({
      projectRoot,
      s3,
      platforms,
      id,
      title: values.title,
      ...git,
      changelog,
      entryFile: values["entry-file"],
    });
  } else if (command === "unpublish") {
    if (!arg) throw new Error("Which preview? preview-ready unpublish <id>");
    await unpublish(s3, arg);
  } else if (command === "prune") {
    await prune(s3);
  } else {
    throw new Error(`Unknown command ${command}.\n\n${HELP}`);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `preview-ready: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
});
