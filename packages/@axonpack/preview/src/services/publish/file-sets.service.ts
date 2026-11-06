import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import type { FileSet } from "../../utils/config/expo-config.util";
import {
  FileSetInfo,
  ManifestFile,
  fileSetPath,
} from "../../utils/previews/layout.util";

export type BuiltFile = ManifestFile & { absolutePath: string };

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );

/** Every file under `dir`, hashed, at its path from `dir` with forward slashes, after `prefix`. */
export const listFiles = (dir: string, prefix = ""): BuiltFile[] =>
  walk(dir).map((absolutePath) => {
    const data = readFileSync(absolutePath);
    return {
      absolutePath,
      path: prefix + relative(dir, absolutePath).split(sep).join("/"),
      sha256: createHash("sha256").update(data).digest("hex"),
      size: data.length,
    };
  });

const log = (message: string) => process.stdout.write(`${message}\n`);

/**
 * Runs each set's `build` in a shell from the project root. It inherits this process's env, which
 * holds the EAS environment's values after `--environment`, so the files are built with the same
 * variables as the bundle. A command that fails stops the publish.
 */
export function buildFileSets(
  projectRoot: string,
  sets: Record<string, FileSet>,
): void {
  for (const [name, { build }] of Object.entries(sets)) {
    if (!build) continue;
    log(`files ${name}: building with ${build}`);
    try {
      execSync(build, { cwd: projectRoot, stdio: "inherit", env: process.env });
    } catch (error) {
      const { status } = error as { status?: number | null };
      throw new Error(
        `files.${name}: the build command failed${status ? ` with exit code ${status}` : ""}: ${build}`,
      );
    }
  }
}

/**
 * The files of each set in the config plugin's `files` option, at `files/<name>/...` in the
 * preview, and each set's count and size. `fileSets` is undefined when there are none, so a preview
 * without them is written as before. A missing or empty folder stops the publish, since the app
 * would quietly keep its default copy.
 */
export function readFileSets(
  projectRoot: string,
  sets: Record<string, FileSet>,
): { files: BuiltFile[]; fileSets?: Record<string, FileSetInfo> } {
  const files: BuiltFile[] = [];
  const fileSets: Record<string, FileSetInfo> = {};
  for (const [name, { folder, build }] of Object.entries(sets)) {
    const dir = resolve(projectRoot, folder);
    const found =
      existsSync(dir) && statSync(dir).isDirectory()
        ? listFiles(dir, `${fileSetPath(name)}/`)
        : [];
    if (found.length === 0) {
      throw new Error(
        `files.${name}: ${folder} has no files. ${build ? "Check that its build command writes there." : "Build it before publishing, or give the set a build command."}`,
      );
    }
    files.push(...found);
    fileSets[name] = {
      files: found.length,
      size: found.reduce((sum, f) => sum + f.size, 0),
    };
  }
  return files.length > 0 ? { files, fileSets } : { files };
}
