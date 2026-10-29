import type { RegisteredServer } from "../../../constants/dev-preview-servers/dev-preview-servers.const";
import { type ScannedServer, mergeServers } from "../merge-servers.util";

const scanned = (
  port: number,
  slug: string,
  version = "1.0.0",
  plugins?: unknown[],
): ScannedServer => ({
  host: "localhost",
  port,
  url: `http://localhost:${port}/index.bundle?platform=ios`,
  expo: { slug, name: slug, version, plugins: plugins as never },
});

const registered = (
  port: number,
  keys: RegisteredServer["keys"],
): RegisteredServer => ({
  id: `${port}-x`,
  port,
  title: "Task 1 login fix",
  branch: "task-1-login-fix",
  worktree: "/w/task-1",
  slug: "shop",
  name: "Shop",
  compatibility: "appVersion",
  keys,
  startedAt: "t",
});

const merge = (input: Partial<Parameters<typeof mergeServers>[0]>) =>
  mergeServers({
    registry: [],
    scanned: [],
    appSlug: "shop",
    buildKey: "version-1.0.0",
    platform: "ios",
    ...input,
  });

test("another app's servers are left out", () => {
  const servers = merge({
    scanned: [scanned(8081, "shop"), scanned(8082, "other-app")],
  });
  expect(servers.map((s) => s.port)).toEqual([8081]);
});

test("the same app with another native key is listed as incompatible, not hidden", () => {
  const servers = merge({
    scanned: [scanned(8081, "shop"), scanned(8082, "shop", "2.0.0")],
  });
  expect(servers.map((s) => [s.port, s.key, s.compatible])).toEqual([
    [8081, "version-1.0.0", true],
    [8082, "version-2.0.0", false],
  ]);
});

test("a plain server in fingerprint mode has an unknown key", () => {
  const servers = merge({
    scanned: [
      scanned(8081, "shop", "1.0.0", [
        ["@axonpack/preview", { compatibility: "fingerprint" }],
      ]),
    ],
  });
  expect(servers[0]).toMatchObject({
    key: null,
    compatible: null,
    announced: false,
  });
});

test("an announced server uses the registry's branch, title and key", () => {
  const servers = merge({
    scanned: [scanned(8083, "shop")],
    registry: [registered(8083, { ios: "fingerprint-abc" })],
  });
  expect(servers[0]).toMatchObject({
    title: "Task 1 login fix",
    branch: "task-1-login-fix",
    worktree: "/w/task-1",
    key: "fingerprint-abc",
    compatible: false,
    announced: true,
    hostPort: "localhost:8083",
  });
});

test("an announced server that stopped answering is not listed", () => {
  expect(
    merge({ registry: [registered(8083, { ios: "version-1.0.0" })] }),
  ).toEqual([]);
});
