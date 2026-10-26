import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";

import type { Platform } from "../core/layout";
import { changelogFromSubjects } from "./changelog";

const git = (cwd: string, args: string[]): string | null => {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
};

// The copies the app's own `expo` uses, so the fingerprint and version match what its native build
// used. They are dependencies of `expo`, not of the app, so they are resolved from there.
const appRequire = (projectRoot: string) => {
  const expo = createRequire(join(projectRoot, "package.json")).resolve("expo/package.json");
  return createRequire(expo);
};

export function appVersion(projectRoot: string, platform: Platform) {
  const { getConfig } = appRequire(projectRoot)("@expo/config");
  const { exp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  return {
    appVersion: String(exp.version ?? ""),
    buildNumber: String(
      (platform === "ios" ? exp.ios?.buildNumber : exp.android?.versionCode) ??
        "",
    ),
  };
}

export async function fingerprint(
  projectRoot: string,
  platform: Platform,
): Promise<string> {
  const { createFingerprintAsync } =
    appRequire(projectRoot)("@expo/fingerprint");
  const result = await createFingerprintAsync(projectRoot, {
    platforms: [platform],
    silent: true,
  });
  return result.hash as string;
}

export function gitInfo(projectRoot: string) {
  return {
    branch: git(projectRoot, ["rev-parse", "--abbrev-ref", "HEAD"]) ?? "",
    commit: git(projectRoot, ["rev-parse", "--short", "HEAD"]) ?? "",
    author:
      git(projectRoot, ["log", "-1", "--format=%an"]) ??
      git(projectRoot, ["config", "user.name"]) ??
      "",
  };
}

/** The repo's default branch: what origin/HEAD points at, else main or master if one exists. */
export function defaultBase(projectRoot: string): string | null {
  const head = git(projectRoot, [
    "symbolic-ref",
    "--short",
    "refs/remotes/origin/HEAD",
  ]);
  if (head) return head;
  for (const name of ["main", "master"]) {
    if (git(projectRoot, ["rev-parse", "--verify", "--quiet", name]) !== null)
      return name;
  }
  return null;
}

/** The commit subjects on this branch since it left the base branch. Empty when there are none. */
export function changelogSince(
  projectRoot: string,
  base: string | null,
): string {
  if (!base) return "";
  const forkPoint = git(projectRoot, ["merge-base", "HEAD", base]);
  if (!forkPoint) return "";
  const subjects = git(projectRoot, [
    "log",
    "--format=%s",
    `${forkPoint}..HEAD`,
  ]);
  return changelogFromSubjects(subjects ? subjects.split("\n") : []);
}
