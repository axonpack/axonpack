import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { S3Config } from "../../s3/s3.service";
import { PLUGIN_NAME } from "../../../utils/config/expo-config.util";
import type { IndexEntry, Manifest } from "../../../utils/previews/layout.util";
import { publish } from "../commands.service";
import { applyEasEnv } from "../eas-env.service";
import { buildFileSets, readFileSets } from "../file-sets.service";

jest.mock("node:child_process", () => {
  const actual =
    jest.requireActual<typeof import("node:child_process")>(
      "node:child_process",
    );
  return {
    ...actual,
    execSync: jest.fn(actual.execSync),
    // `eas env:pull`, writing what eas-cli writes.
    execFileSync: jest.fn((_command: string, args: string[]) => {
      jest
        .requireActual<typeof import("node:fs")>("node:fs")
        .writeFileSync(
          args[args.indexOf("--path") + 1],
          "NEXT_PUBLIC_API=https://api.preview.example.com\n",
        );
      return "";
    }),
  };
});

const BUNDLE_SHA = "a".repeat(64);
jest.mock("../bundle.service", () => ({
  buildBundle: () => ({
    files: [
      {
        absolutePath: __filename,
        path: "main.jsbundle",
        sha256: "a".repeat(64),
        size: 12,
      },
    ],
    hermesVersion: 96,
  }),
}));
jest.mock("../../cli/project.service", () => ({
  fingerprint: async () => "fp",
}));

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

const sha = (text: string) => createHash("sha256").update(text).digest("hex");

/** A project with a built web app in web/dist. */
function project() {
  const root = mkdtempSync(join(tmpdir(), "preview-file-sets-"));
  mkdirSync(join(root, "web/dist/js"), { recursive: true });
  writeFileSync(join(root, "web/dist/index.html"), "<p>hi</p>");
  writeFileSync(join(root, "web/dist/js/app.js"), "go()");
  return root;
}

test("each set's files sit under files/<name>/ with their hash and size", () => {
  const { files, fileSets } = readFileSets(project(), {
    www: { folder: "web/dist" },
  });
  expect(
    files.map(({ path, sha256, size }) => ({ path, sha256, size })),
  ).toEqual(
    expect.arrayContaining([
      { path: "files/www/index.html", sha256: sha("<p>hi</p>"), size: 9 },
      { path: "files/www/js/app.js", sha256: sha("go()"), size: 4 },
    ]),
  );
  expect(files).toHaveLength(2);
  expect(fileSets).toEqual({ www: { files: 2, size: 13 } });
});

test("no sets: no files and no fileSets, so the manifest looks as it always did", () => {
  expect(readFileSets(project(), {})).toEqual({ files: [] });
});

test("a missing or empty folder stops the publish and names it", () => {
  const root = project();
  mkdirSync(join(root, "empty"));
  expect(() => readFileSets(root, { www: { folder: "web/out" } })).toThrow(
    "files.www: web/out has no files. Build it before publishing, or give the set a build command.",
  );
  expect(() => readFileSets(root, { www: { folder: "empty" } })).toThrow(
    "files.www: empty has no files",
  );
  expect(() =>
    readFileSets(root, { www: { folder: "web/out" } }, true),
  ).toThrow(
    "files.www: web/out has no files in the copy. Build it before publishing, or give the set a build command. Check that .easignore doesn't list it.",
  );
});

test("a set's build runs from the folder and with the env it is given", () => {
  jest.spyOn(process.stdout, "write").mockImplementationOnce(() => true);
  const root = project();
  buildFileSets(
    root,
    {
      www: {
        folder: "out",
        build: 'mkdir out && printf %s "$PREVIEW_PUBLISH" > out/v',
      },
    },
    {
      ...process.env,
      PREVIEW_PUBLISH: "1",
    },
  );
  expect(readFileSync(join(root, "out/v"), "utf8")).toBe("1");
});

describe("publish", () => {
  const objects = new Map<string, string>();
  beforeEach(() => {
    objects.clear();
    (execSync as jest.Mock).mockClear();
    jest.spyOn(process.stdout, "write").mockImplementation(() => true);
    global.fetch = jest.fn(async (input: string | URL, init?: RequestInit) => {
      const key = decodeURIComponent(
        new URL(String(input)).pathname.replace(/^\/b\//, ""),
      );
      const method = init?.method ?? "GET";
      if (method === "PUT") {
        objects.set(key, String(init?.body));
        return new Response("");
      }
      const found = objects.get(key);
      if (found === undefined) return new Response("", { status: 404 });
      return new Response(method === "HEAD" ? null : found, {
        headers: { etag: '"1"' },
      });
    }) as typeof fetch;
  });
  afterEach(() => jest.restoreAllMocks());

  const s3: S3Config = {
    endpoint: "http://s3.test",
    bucket: "b",
    region: "us-east-1",
    slug: "app",
  };
  const run = (projectRoot: string, files?: Record<string, unknown>) =>
    publish({
      projectRoot,
      config: {
        version: "1.0.0",
        plugins: [files ? [PLUGIN_NAME, { files }] : PLUGIN_NAME],
      },
      compatibility: "appVersion",
      s3,
      platforms: ["ios"],
      id: "task-1",
      title: "Task 1",
      branch: "task-1",
      commit: "abc",
      author: "Dev",
      changelog: "- a",
      work: temp("run"),
      inPlace: true,
    });
  const lines = () =>
    (process.stdout.write as jest.Mock).mock.calls.map(([text]) =>
      String(text),
    );
  const json = <T>(key: string) => JSON.parse(objects.get(`app/${key}`)!) as T;
  const manifest = () =>
    json<Manifest>("previews/ios/version-1.0.0/task-1.json");
  const entry = () =>
    json<{ previews: IndexEntry[] }>("index/ios/version-1.0.0.json")
      .previews[0];

  test("uploads the sets' files with the bundle and lists them in the manifest and the index", async () => {
    await run(project(), { www: "web/dist" });
    // The bundle first; a folder's own order depends on the file system.
    const paths = manifest().files.map((f) => f.path);
    expect(paths[0]).toBe("main.jsbundle");
    expect(paths.slice(1).sort()).toEqual([
      "files/www/index.html",
      "files/www/js/app.js",
    ]);
    expect(manifest().fileSets).toEqual({ www: { files: 2, size: 13 } });
    expect(entry().fileSets).toEqual({ www: { files: 2, size: 13 } });
    expect(entry().size).toBe(12 + 13);
    expect(objects.has(`app/files/${sha("<p>hi</p>")}`)).toBe(true);
    expect(objects.has(`app/files/${sha("go()")}`)).toBe(true);
    expect(lines()).toContain("files www: 2 files from web/dist\n");
  });

  test("a set's build runs first, from the project root, with the --environment values", async () => {
    const root = project();
    applyEasEnv(root, "preview", join(root, "env"));
    try {
      await run(root, {
        www: {
          folder: "web/out",
          build:
            'mkdir -p web/out && printf %s "$NEXT_PUBLIC_API" > web/out/env.txt',
        },
      });
    } finally {
      delete process.env.NEXT_PUBLIC_API;
    }
    // The file the build wrote holds the value, and it went up under that content's hash.
    const value = sha("https://api.preview.example.com");
    expect(manifest().files).toContainEqual(
      expect.objectContaining({ path: "files/www/env.txt", sha256: value }),
    );
    expect(objects.has(`app/files/${value}`)).toBe(true);
    const building = lines().indexOf(
      'files www: building with mkdir -p web/out && printf %s "$NEXT_PUBLIC_API" > web/out/env.txt\n',
    );
    expect(building).toBeGreaterThanOrEqual(0);
    expect(lines().indexOf("files www: 1 files from web/out\n")).toBe(
      building + 1,
    );
  });

  test("a build command that fails stops the publish before anything goes up", async () => {
    await expect(
      run(project(), { www: { folder: "web/dist", build: "exit 3" } }),
    ).rejects.toThrow(
      "files.www: the build command failed with exit code 3: exit 3",
    );
    expect(objects.size).toBe(0);
  });

  test("a set given as a folder only runs no command", async () => {
    await run(project(), { www: "web/dist" });
    expect(execSync).not.toHaveBeenCalled();
  });

  test("a changed web build gives a new revision, so the app shows Update available", async () => {
    const root = project();
    await run(root, { www: "web/dist" });
    const before = entry().revision;
    writeFileSync(join(root, "web/dist/js/app.js"), "go(2)");
    await run(root, { www: "web/dist" });
    expect(entry().revision).not.toBe(before);
  });

  test("without sets, the manifest, the entry and the revision are what they were before", async () => {
    await run(project());
    expect(manifest().files.map((f) => f.path)).toEqual(["main.jsbundle"]);
    expect("fileSets" in manifest()).toBe(false);
    expect("fileSets" in entry()).toBe(false);
    expect(entry().revision).toBe(
      sha(`main.jsbundle:${BUNDLE_SHA}`).slice(0, 16),
    );
  });
});
