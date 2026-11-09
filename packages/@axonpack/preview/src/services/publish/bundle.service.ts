import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { BUNDLE_FILE, Platform } from "../../utils/previews/layout.util";
import { appRequire } from "../cli/project.service";
import { listFiles } from "./file-sets.service";

/** Hermes bytecode starts with an 8-byte magic number, then its version as a 32-bit int. */
const HERMES_MAGIC = Buffer.from([
  0xc6, 0x1f, 0xbc, 0x03, 0xc1, 0x03, 0x19, 0x1f,
]);
export const hermesVersion = (bundle: Buffer): number | null =>
  bundle.length >= 12 && bundle.subarray(0, 8).equals(HERMES_MAGIC)
    ? bundle.readUInt32LE(8)
    : null;

/**
 * The same release bundle and images the native build embeds, as Hermes bytecode, exported from
 * `root` (the app's folder in the copy, or the project root with --in-place) into `outDir`, which
 * is inside the publish's run folder and goes with it.
 */
export function buildBundle(
  root: string,
  platform: Platform,
  {
    entryFile,
    outDir: out,
    env,
  }: {
    entryFile?: string;
    outDir: string;
    env: NodeJS.ProcessEnv;
  },
) {
  mkdirSync(out, { recursive: true });
  const args = [
    // The app's own Expo CLI, run with Node and no package manager. Through npx, npm printed
    // EBADDEVENGINES warnings in a workspace whose devEngines names pnpm or bun.
    appRequire(root).resolve("./bin/cli"),
    "export:embed",
    "--platform",
    platform,
    "--dev",
    "false",
    "--bytecode",
    "--bundle-output",
    join(out, BUNDLE_FILE[platform]),
    "--assets-dest",
    out,
  ];
  if (entryFile) args.push("--entry-file", entryFile);
  execFileSync(process.execPath, args, { cwd: root, stdio: "inherit", env });

  const files = listFiles(out);
  const bundle = readFileSync(join(out, BUNDLE_FILE[platform]));
  return { files, hermesVersion: hermesVersion(bundle) };
}
