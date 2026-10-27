import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";

import {
  BUNDLE_FILE,
  ManifestFile,
  Platform,
} from "../../utils/previews/layout.util";

export type BuiltFile = ManifestFile & { absolutePath: string };

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );

/** Hermes bytecode starts with an 8-byte magic number, then its version as a 32-bit int. */
const HERMES_MAGIC = Buffer.from([
  0xc6, 0x1f, 0xbc, 0x03, 0xc1, 0x03, 0x19, 0x1f,
]);
export const hermesVersion = (bundle: Buffer): number | null =>
  bundle.length >= 12 && bundle.subarray(0, 8).equals(HERMES_MAGIC)
    ? bundle.readUInt32LE(8)
    : null;

/** The same release bundle and images the native build embeds, as Hermes bytecode. */
export function buildBundle(
  projectRoot: string,
  platform: Platform,
  entryFile?: string,
) {
  const out = mkdtempSync(join(tmpdir(), `preview-${platform}-`));
  const args = [
    "expo",
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
  execFileSync("npx", args, { cwd: projectRoot, stdio: "inherit" });

  const files: BuiltFile[] = walk(out).map((absolutePath) => {
    const data = readFileSync(absolutePath);
    return {
      absolutePath,
      path: relative(out, absolutePath).split(sep).join("/"),
      sha256: createHash("sha256").update(data).digest("hex"),
      size: statSync(absolutePath).size,
    };
  });
  const bundle = readFileSync(join(out, BUNDLE_FILE[platform]));
  return { files, hermesVersion: hermesVersion(bundle) };
}
