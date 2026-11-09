import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { appRequire } from "../../cli/project.service";
import {
  copyEnv,
  copyProject,
  easignore,
  installCommand,
  prepareCopy,
  removeInBackground,
} from "../copy.service";

const actual =
  jest.requireActual<typeof import("node:child_process")>("node:child_process");
jest.mock("node:child_process", () => {
  const real =
    jest.requireActual<typeof import("node:child_process")>(
      "node:child_process",
    );
  return { ...real, execFileSync: jest.fn(real.execFileSync) };
});
jest.mock("../../cli/project.service", () => ({
  ...jest.requireActual("../../cli/project.service"),
  // The package's own expo stands in for the app's.
  appRequire: jest.fn(() =>
    jest
      .requireActual<typeof import("node:module")>("node:module")
      .createRequire(require.resolve("expo/package.json")),
  ),
}));
const exec = execFileSync as unknown as jest.Mock;

// The app's types make NODE_ENV required on ProcessEnv.
const vars = (values: Record<string, string | undefined> = {}) =>
  values as NodeJS.ProcessEnv;

// Every temp folder a test makes, deleted after the file's tests.
const made: string[] = [];
const temp = (name: string) => {
  const dir = mkdtempSync(join(tmpdir(), `preview-${name}-`));
  made.push(dir);
  return dir;
};
afterAll(() =>
  made.forEach((dir) => rmSync(dir, { recursive: true, force: true })),
);

/** A git repo with `committed` in its first commit. */
function repo(committed: Record<string, string>) {
  const dir = temp("copy");
  const git = (...args: string[]) =>
    actual.execFileSync(
      "git",
      ["-c", "user.name=t", "-c", "user.email=t@t", ...args],
      { cwd: dir, stdio: "ignore" },
    );
  git("init", "-q", "-b", "main");
  write(dir, committed);
  git("add", "-A", "-f");
  git("commit", "-q", "-m", "first");
  return { dir, git };
}

function write(dir: string, files: Record<string, string>) {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
}

beforeEach(() => {
  exec.mockReset();
  exec.mockImplementation(actual.execFileSync);
  jest.spyOn(process.stdout, "write").mockImplementation(() => true);
});
afterEach(() => jest.restoreAllMocks());

describe("what goes in the copy", () => {
  const tree = (dir: string) =>
    actual
      .execFileSync("find", [".", "-not", "-path", "./.git/*"], {
        cwd: dir,
        encoding: "utf8",
      })
      .split("\n")
      .filter((p) => p && p !== "." && p !== "./.git")
      .map((p) => p.slice(2))
      .sort();

  test("every file, git-ignored ones too, without node_modules or build output at any depth", () => {
    const dir = temp("src");
    write(dir, {
      ".gitignore": ".env.local\nweb/out/\n",
      ".env.local": "API=1",
      "package.json": "{}",
      "web/out/index.html": "<p>",
      "node_modules/pkg/index.js": "pkg",
      ".expo/types.d.ts": "x",
      "apps/mobile/app.json": "{}",
      "apps/mobile/node_modules/x/index.js": "x",
      "apps/mobile/.expo/web.json": "x",
      "apps/mobile/ios/Podfile": "pods",
      "apps/mobile/ios/Pods/Manifest.lock": "x",
      "apps/mobile/ios/build/app.o": "x",
      "apps/mobile/android/app/src/main/AndroidManifest.xml": "<manifest/>",
      "apps/mobile/android/app/build/out.apk": "x",
      "apps/mobile/android/build/x": "x",
      "apps/mobile/android/.gradle/x": "x",
    });
    symlinkSync("app.json", join(dir, "apps/mobile/link"));
    const dest = join(temp("dest"), "android");

    expect(copyProject(dir, dest)).toEqual({ git: true });

    expect(tree(dest)).toEqual([
      ".env.local",
      ".gitignore",
      "apps",
      "apps/mobile",
      "apps/mobile/android",
      "apps/mobile/android/app",
      "apps/mobile/android/app/src",
      "apps/mobile/android/app/src/main",
      "apps/mobile/android/app/src/main/AndroidManifest.xml",
      "apps/mobile/app.json",
      "apps/mobile/ios",
      "apps/mobile/ios/Podfile",
      "apps/mobile/link",
      "package.json",
      "web",
      "web/out",
      "web/out/index.html",
    ]);
    expect(readlinkSync(join(dest, "apps/mobile/link"))).toBe("app.json");
    // A copy, not a link to the same file.
    writeFileSync(join(dest, "package.json"), "changed");
    expect(readFileSync(join(dir, "package.json"), "utf8")).toBe("{}");
  });

  test("a .easignore at the root leaves out what it lists, and ! keeps a file", () => {
    const dir = temp("src");
    write(dir, {
      ".easignore": "docs/\n*.log\n!keep.log\n",
      "app.json": "{}",
      "docs/.next/cache/big": "x",
      "x.log": "x",
      "keep.log": "k",
      "sub/y.log": "y",
    });
    const dest = join(temp("dest"), "ios");
    copyProject(dir, dest, easignore(dir, dir));
    expect(tree(dest)).toEqual([".easignore", "app.json", "keep.log", "sub"]);
  });

  test("a .git folder is copied, so git works in the copy, at the same commit with the same changes", () => {
    const { dir } = repo({ "a.txt": "a", "changed.txt": "old" });
    write(dir, { "changed.txt": "new", "sub/untracked.txt": "u" });
    const dest = join(temp("dest"), "android");

    copyProject(dir, dest);

    const git = (cwd: string, ...args: string[]) =>
      actual.execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
    expect(git(dest, "rev-parse", "--show-toplevel")).toBe(realpathSync(dest));
    expect(git(dest, "rev-parse", "HEAD")).toBe(git(dir, "rev-parse", "HEAD"));
    expect(git(dest, "status", "--porcelain")).toBe(
      git(dir, "status", "--porcelain"),
    );
  });

  test("a shallow .git, as a CI checkout has, copies and works", () => {
    const { dir: origin } = repo({ "a.txt": "a" });
    const dir = join(temp("ci"), "checkout");
    actual.execFileSync(
      "git",
      ["clone", "-q", "--depth", "1", `file://${origin}`, dir],
      { stdio: "ignore" },
    );
    const dest = join(temp("dest"), "android");
    copyProject(dir, dest);
    const git = (...args: string[]) =>
      actual.execFileSync("git", args, { cwd: dest, encoding: "utf8" }).trim();
    expect(git("rev-parse", "--is-shallow-repository")).toBe("true");
    expect(git("log", "--format=%s")).toBe("first");
  });

  test("a git worktree's .git file is left out, so git in the copy can't reach the real repo", () => {
    const { git } = repo({ "a.txt": "a" });
    const worktree = join(temp("wt"), "feature");
    git("worktree", "add", "-q", worktree, "-b", "feature");
    const dest = join(temp("dest"), "android");

    expect(copyProject(worktree, dest)).toEqual({ git: false });

    expect(existsSync(join(dest, ".git"))).toBe(false);
    expect(readFileSync(join(dest, "a.txt"), "utf8")).toBe("a");
    expect(() =>
      actual.execFileSync("git", ["status"], { cwd: dest, stdio: "pipe" }),
    ).toThrow(/not a git repository/);
  });
});

test("removeInBackground moves the folder out at once and deletes it from another process", async () => {
  const run = temp("run");
  write(run, {
    "android/node_modules/a/index.js": "a",
    "android/app.json": "{}",
  });
  const to = `${run}-android`;
  made.push(to);
  removeInBackground(join(run, "android"), to);
  expect(existsSync(join(run, "android"))).toBe(false);
  for (let i = 0; i < 100 && existsSync(to); i++)
    await new Promise((done) => setTimeout(done, 50));
  expect(existsSync(to)).toBe(false);
});

describe("installCommand", () => {
  test.each([
    ["npm", false, true, "npm ci --include=dev"],
    ["npm", false, false, "npm install --include=dev"],
    ["yarn", false, true, "yarn install --frozen-lockfile --production false"],
    ["yarn", false, false, "yarn install --production false"],
    ["yarn", true, true, "yarn install --inline-builds --immutable"],
    ["yarn", true, false, "yarn install --inline-builds --no-immutable"],
    ["pnpm", false, true, "pnpm install --frozen-lockfile"],
    ["pnpm", false, false, "pnpm install --no-frozen-lockfile"],
    ["bun", false, true, "bun install --frozen-lockfile"],
    ["bun", false, false, "bun install"],
  ] as const)(
    "%s (Yarn 2+: %s, frozen: %s)",
    (manager, yarnModern, frozen, command) => {
      expect(installCommand({ manager, yarnModern, frozen }).join(" ")).toBe(
        command,
      );
    },
  );
});

test("copyEnv sets what is true of a preview publish, and no build id, profile or runner", () => {
  const env = copyEnv({
    platform: "ios",
    root: "/tmp/run/ios",
    commit: "f".repeat(40),
    env: vars({ PATH: "/bin", API_URL: "https://api" }),
  });
  expect(env).toEqual({
    PATH: "/bin",
    API_URL: "https://api",
    EAS_BUILD: "1",
    EAS_BUILD_PLATFORM: "ios",
    EAS_BUILD_WORKINGDIR: "/tmp/run/ios",
    EAS_BUILD_GIT_COMMIT_HASH: "f".repeat(40),
    PREVIEW_PUBLISH: "1",
  });
  for (const key of [
    "EAS_BUILD_ID",
    "EAS_BUILD_PROFILE",
    "EAS_BUILD_RUNNER",
    "EAS_BUILD_USERNAME",
    "CI",
  ])
    expect(key in env).toBe(false);
});

describe("prepareCopy", () => {
  type Call = { command: string; cwd: string; env: Record<string, string> };
  let calls: Call[];
  /** Runs git for real; records every other command and answers it with `answer`. */
  const fake = (answer: (command: string) => string = () => "") =>
    exec.mockImplementation((bin: string, args: string[], options) => {
      if (bin === "git") return actual.execFileSync(bin, args, options);
      const command = [bin, ...args].join(" ");
      calls.push({ command, cwd: options.cwd, env: options.env });
      return answer(command);
    });
  beforeEach(() => {
    calls = [];
  });

  /** A Yarn workspace with the app in apps/mobile. */
  const monorepo = (scripts: Record<string, string>) =>
    repo({
      "package.json": JSON.stringify({ workspaces: ["apps/*"] }),
      "yarn.lock": "",
      "apps/mobile/package.json": JSON.stringify({ name: "mobile", scripts }),
    }).dir;

  test("runs pre-install (through npm under Yarn), the install in the workspace root, then post-install, in the copy", () => {
    const dir = monorepo({
      "eas-build-pre-install": "echo pre",
      "eas-build-post-install": "echo post",
    });
    fake((command) => (command === "yarn --version" ? "4.5.0\n" : ""));
    const dest = join(temp("dest"), "android");

    const { appDir, env } = prepareCopy({
      projectRoot: join(dir, "apps/mobile"),
      dest,
      platform: "android",
      env: vars({ PATH: process.env.PATH }),
    });

    expect(appDir).toBe(join(dest, "apps/mobile"));
    expect(existsSync(join(appDir, "package.json"))).toBe(true);
    expect(calls.map(({ command, cwd }) => [command, cwd])).toEqual([
      ["npm run eas-build-pre-install", appDir],
      ["yarn --version", dest],
      ["yarn install --inline-builds --immutable", dest],
      ["yarn run eas-build-post-install", appDir],
    ]);
    // Read from the user's folder.
    const commit = actual
      .execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: dir,
        encoding: "utf8",
      })
      .trim();
    for (const call of calls)
      expect(call.env).toMatchObject({
        EAS_BUILD: "1",
        EAS_BUILD_PLATFORM: "android",
        EAS_BUILD_WORKINGDIR: dest,
        EAS_BUILD_GIT_COMMIT_HASH: commit,
        PREVIEW_PUBLISH: "1",
      });
    expect(env).toEqual(calls[0].env);
    const printed = (process.stdout.write as jest.Mock).mock.calls.map(
      ([text]) => String(text),
    );
    expect(printed).toEqual([
      `android: copying ${dir} to ${dest}\n`,
      "android: eas-build-pre-install\n",
      "android: yarn install --inline-builds --immutable\n",
      "android: eas-build-post-install\n",
    ]);
  });

  test("a hook the app doesn't have is not run, and Yarn 1 gets its own install", () => {
    const dir = monorepo({ start: "expo start" });
    fake((command) => (command === "yarn --version" ? "1.22.22\n" : ""));
    prepareCopy({
      projectRoot: join(dir, "apps/mobile"),
      dest: join(temp("dest"), "ios"),
      platform: "ios",
      env: vars(),
    });
    expect(calls.map((c) => c.command)).toEqual([
      "yarn --version",
      "yarn install --frozen-lockfile --production false",
    ]);
  });

  test("EAS_NO_FROZEN_LOCKFILE installs without a frozen lockfile", () => {
    const { dir } = repo({ "package.json": "{}", "bun.lock": "" });
    fake();
    prepareCopy({
      projectRoot: dir,
      dest: join(temp("dest"), "ios"),
      platform: "ios",
      env: vars({ EAS_NO_FROZEN_LOCKFILE: "1" }),
    });
    expect(calls.map((c) => c.command)).toEqual(["bun install"]);
  });

  test("a hook that fails stops it, naming the hook and its command", () => {
    const { dir } = repo({
      "package.json": JSON.stringify({
        scripts: { "eas-build-pre-install": "exit 2" },
      }),
      "bun.lock": "",
    });
    fake((command) => {
      throw Object.assign(new Error(`Command failed: ${command}`), {
        status: 2,
      });
    });
    expect(() =>
      prepareCopy({
        projectRoot: dir,
        dest: join(temp("dest"), "android"),
        platform: "android",
        env: vars(),
      }),
    ).toThrow(
      "android: eas-build-pre-install failed with exit code 2: bun run eas-build-pre-install",
    );
  });

  test("a frozen install that fails says how to get past a stale lockfile", () => {
    const { dir } = repo({ "package.json": "{}", "package-lock.json": "{}" });
    fake(() => {
      throw Object.assign(new Error("npm ci"), { status: 1 });
    });
    expect(() =>
      prepareCopy({
        projectRoot: dir,
        dest: join(temp("dest"), "android"),
        platform: "android",
        env: vars(),
      }),
    ).toThrow(
      "android: npm ci --include=dev failed with exit code 1. If the lockfile is out of date, update it, or set EAS_NO_FROZEN_LOCKFILE=1.",
    );
  });

  test("no lockfile stops it", () => {
    const { dir } = repo({ "package.json": "{}" });
    fake();
    expect(() =>
      prepareCopy({
        projectRoot: dir,
        dest: join(temp("dest"), "android"),
        platform: "android",
        env: vars(),
      }),
    ).toThrow("android: no lockfile in the app's folder or its workspace root");
    expect(calls).toEqual([]);
  });

  test("a package manager it has no install for stops it before the copy, naming it and its lockfile", () => {
    const { dir } = repo({ "package.json": "{}", "nub.lock": "" });
    // What @expo/package-manager 1.14 finds from a nub.lock.
    (appRequire as jest.Mock).mockReturnValueOnce(() => ({
      resolvePackageManager: () => "nub",
      NUB_LOCK_FILE: "nub.lock",
    }));
    fake();
    const dest = join(temp("dest"), "android");
    expect(() =>
      prepareCopy({
        projectRoot: dir,
        dest,
        platform: "android",
        env: vars(),
      }),
    ).toThrow(
      "android: can't install with nub (nub.lock) in a copy of the project. Run preview publish with --in-place to build in the app's folder.",
    );
    expect(calls).toEqual([]);
    expect(existsSync(dest)).toBe(false);
  });

  test("works outside a git repo, with no commit in the env", () => {
    const dir = temp("no-git");
    write(dir, { "package.json": "{}", "bun.lock": "", "app.json": "{}" });
    fake();
    const dest = join(temp("dest"), "android");
    const { appDir, env } = prepareCopy({
      projectRoot: dir,
      dest,
      platform: "android",
      env: vars(),
    });
    expect(appDir).toBe(dest);
    expect(existsSync(join(dest, "app.json"))).toBe(true);
    expect(calls.map((c) => c.command)).toEqual([
      "bun install --frozen-lockfile",
    ]);
    expect("EAS_BUILD_GIT_COMMIT_HASH" in env).toBe(false);
  });

  test("from a git worktree it says git isn't in the copy, and goes on", () => {
    const { git } = repo({ "package.json": "{}", "bun.lock": "" });
    const worktree = join(temp("wt"), "feature");
    git("worktree", "add", "-q", worktree, "-b", "feature");
    fake();
    const dest = join(temp("dest"), "ios");
    const { env } = prepareCopy({
      projectRoot: worktree,
      dest,
      platform: "ios",
      env: vars(),
    });
    expect(env.EAS_BUILD_GIT_COMMIT_HASH).toMatch(/^[0-9a-f]{40}$/);
    expect(
      (process.stdout.write as jest.Mock).mock.calls.map(([t]) => String(t)),
    ).toContain(
      `ios: no git in the copy, since .git in ${worktree} is a file pointing at another folder (a git worktree or submodule)\n`,
    );
  });
});
