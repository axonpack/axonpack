import { execFileSync, spawn } from "node:child_process";
import {
  constants,
  cpSync,
  existsSync,
  lstatSync,
  readFileSync,
  renameSync,
} from "node:fs";
import { createRequire } from "node:module";
import { basename, join, relative, sep } from "node:path";

import type { Platform } from "../../utils/previews/layout.util";
import { appRequire, gitHead } from "../cli/project.service";

type Env = NodeJS.ProcessEnv;
const MANAGERS = ["npm", "yarn", "pnpm", "bun"] as const;
export type Manager = (typeof MANAGERS)[number];
const canInstall = (name: string): name is Manager =>
  (MANAGERS as readonly string[]).includes(name);

const log = (message: string) => process.stdout.write(`${message}\n`);

/**
 * Left out of the copy at any depth: dependencies, which the copy installs itself, and output the
 * native build and Expo make again.
 */
export const SKIPPED = [
  "node_modules",
  ".expo",
  "ios/Pods",
  "ios/build",
  "android/build",
  "android/app/build",
  "android/.gradle",
];
const SKIP = new RegExp(
  `(^|/)(${SKIPPED.map((path) => path.replaceAll(".", "\\.")).join("|")})$`,
);

/** `.easignore` at the copy's root, read the way git reads a `.gitignore`. */
export function easignore(projectRoot: string, root: string) {
  const file = join(root, ".easignore");
  if (!existsSync(file)) return undefined;
  // `ignore` comes with @expo/fingerprint, a dependency of expo in every SDK this package supports.
  const ignore = createRequire(
    appRequire(projectRoot).resolve("@expo/fingerprint/package.json"),
  )("ignore");
  const rules = ignore().add(readFileSync(file, "utf8"));
  return (path: string, dir: boolean): boolean =>
    rules.ignores(dir ? `${path}/` : path);
}

/**
 * Copies `root` to `dest`, git-ignored files included, minus `SKIPPED` and what `ignored` lists.
 * A `.git` folder goes in, so git works in the copy. A `.git` file (a worktree or a submodule) is
 * left out, since it points at the real repository and git there would change it.
 * `git: false` when the root's own `.git` was such a file.
 */
export function copyProject(
  root: string,
  dest: string,
  ignored?: (path: string, dir: boolean) => boolean,
): { git: boolean } {
  let git = true;
  cpSync(root, dest, {
    recursive: true,
    verbatimSymlinks: true,
    // Copy-on-write where the file system has it, else a plain copy.
    mode: constants.COPYFILE_FICLONE,
    filter: (src) => {
      const path = relative(root, src).split(sep).join("/");
      if (path === "") return true;
      if (SKIP.test(path)) return false;
      if (basename(src) === ".git") {
        if (lstatSync(src).isDirectory()) return true;
        if (path === ".git") git = false;
        return false;
      }
      return !ignored?.(path, lstatSync(src).isDirectory());
    },
  });
  return { git };
}

/**
 * Deletes `dir` from a process of its own that publish doesn't wait for, since a copy with its
 * `node_modules` takes about 20 s to delete. It moves to `to` first, out of the run folder, so the
 * run folder's own delete at the end doesn't reach into it.
 */
export function removeInBackground(dir: string, to: string) {
  renameSync(dir, to);
  spawn(
    process.execPath,
    [
      "-e",
      'require("fs").rmSync(process.argv[1], { recursive: true, force: true })',
      to,
    ],
    { detached: true, stdio: "ignore", windowsHide: true },
  ).unref();
}

/** The install EAS runs for each package manager. */
export function installCommand({
  manager,
  yarnModern,
  frozen,
}: {
  manager: Manager;
  yarnModern: boolean;
  frozen: boolean;
}): string[] {
  switch (manager) {
    case "npm":
      return ["npm", frozen ? "ci" : "install", "--include=dev"];
    case "yarn":
      if (yarnModern)
        return [
          "yarn",
          "install",
          "--inline-builds",
          frozen ? "--immutable" : "--no-immutable",
        ];
      return frozen
        ? ["yarn", "install", "--frozen-lockfile", "--production", "false"]
        : ["yarn", "install", "--production", "false"];
    case "pnpm":
      return [
        "pnpm",
        "install",
        frozen ? "--frozen-lockfile" : "--no-frozen-lockfile",
      ];
    case "bun":
      return frozen
        ? ["bun", "install", "--frozen-lockfile"]
        : ["bun", "install"];
  }
}

/**
 * The env of every step in the copy. Only what is true of a preview publish: no build id, profile
 * or runner, since there is none, and no commit outside a git repo.
 */
export const copyEnv = ({
  platform,
  root,
  commit,
  env,
}: {
  platform: Platform;
  root: string;
  commit: string | null;
  env: Env;
}): Env => ({
  ...env,
  EAS_BUILD: "1",
  EAS_BUILD_PLATFORM: platform,
  EAS_BUILD_WORKINGDIR: root,
  ...(commit && { EAS_BUILD_GIT_COMMIT_HASH: commit }),
  PREVIEW_PUBLISH: "1",
});

const failed = (error: unknown) => {
  const { status } = error as { status?: number | null };
  return `failed${status ? ` with exit code ${status}` : ""}`;
};

/**
 * Copies the app's workspace root (the app's own folder when it isn't in a workspace) to `dest`,
 * then runs what EAS runs before a build: the `eas-build-pre-install` hook, the install with a
 * frozen lockfile, and `eas-build-post-install`. The install runs in the copy's root, the hooks in
 * the app's folder. Returns the app's folder in the copy and the env for the steps that follow.
 */
export function prepareCopy({
  projectRoot,
  dest,
  platform,
  env = process.env,
}: {
  projectRoot: string;
  dest: string;
  platform: Platform;
  env?: Env;
}): { appDir: string; env: Env } {
  // The app's own copy, the one its `expo` uses, finds the workspace root and its lockfile.
  const pm = appRequire(projectRoot)("@expo/package-manager");
  const manager: string | null = pm.resolvePackageManager(projectRoot);
  if (!manager)
    throw new Error(
      `${platform}: no lockfile in the app's folder or its workspace root, so the copy can't be installed. Run an install once to make one.`,
    );
  // @expo/package-manager 1.14 also finds nub (nub.lock), which has no install command here.
  if (!canInstall(manager)) {
    const lockfile: string | undefined =
      pm[`${manager.toUpperCase()}_LOCK_FILE`];
    throw new Error(
      `${platform}: can't install with ${manager}${lockfile ? ` (${lockfile})` : ""} in a copy of the project. Run preview publish with --in-place to build in the app's folder.`,
    );
  }
  const root: string = pm.resolveWorkspaceRoot(projectRoot) ?? projectRoot;
  log(`${platform}: copying ${root} to ${dest}`);
  if (!copyProject(root, dest, easignore(projectRoot, root)).git)
    log(
      `${platform}: no git in the copy, since .git in ${root} is a file pointing at another folder (a git worktree or submodule)`,
    );
  const appDir = join(dest, relative(root, projectRoot));
  const stepEnv = copyEnv({
    platform,
    root: dest,
    commit: gitHead(projectRoot),
    env,
  });
  const run = ([bin, ...args]: string[], cwd: string) =>
    execFileSync(bin, args, { cwd, stdio: "inherit", env: stepEnv });

  const { scripts = {} } = JSON.parse(
    readFileSync(join(appDir, "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  const hook = (name: string, bin: string) => {
    if (!scripts[name]) return;
    log(`${platform}: ${name}`);
    try {
      run([bin, "run", name], appDir);
    } catch (error) {
      throw new Error(
        `${platform}: ${name} ${failed(error)}: ${bin} run ${name}`,
      );
    }
  };

  // As on EAS, Yarn runs this one hook through npm.
  hook("eas-build-pre-install", manager === "yarn" ? "npm" : manager);
  const frozen = !env.EAS_NO_FROZEN_LOCKFILE;
  const yarnModern =
    manager === "yarn" &&
    !execFileSync("yarn", ["--version"], {
      cwd: dest,
      encoding: "utf8",
      env: stepEnv,
    })
      .trim()
      .startsWith("1.");
  const install = installCommand({ manager, yarnModern, frozen });
  log(`${platform}: ${install.join(" ")}`);
  try {
    run(install, dest);
  } catch (error) {
    throw new Error(
      `${platform}: ${install.join(" ")} ${failed(error)}.${frozen ? " If the lockfile is out of date, update it, or set EAS_NO_FROZEN_LOCKFILE=1." : ""}`,
    );
  }
  hook("eas-build-post-install", manager);
  return { appDir, env: stepEnv };
}
