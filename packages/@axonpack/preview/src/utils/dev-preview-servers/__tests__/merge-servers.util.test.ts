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

describe("an announcement belongs to its own port", () => {
  const kinds = (servers: ReturnType<typeof merge>) =>
    servers.map((s) => [s.port, s.announced, s.announced ? s.title : null]);
  const atPort = (port: number) => registered(port, { ios: "version-1.0.0" });

  test("preview start alone on 8081, the app's default Metro, keeps its own title", () => {
    expect(
      kinds(
        merge({ scanned: [scanned(8081, "shop")], registry: [atPort(8081)] }),
      ),
    ).toEqual([[8081, true, "Task 1 login fix"]]);
  });

  test("then expo start on 8082: 8082 is a plain Expo server, 8081 stays announced", () => {
    expect(
      kinds(
        merge({
          scanned: [scanned(8081, "shop"), scanned(8082, "shop")],
          registry: [atPort(8081)],
        }),
      ),
    ).toEqual([
      [8081, true, "Task 1 login fix"],
      [8082, false, null],
    ]);
  });

  test("the other way round: expo start on 8081, then preview start on 8082", () => {
    expect(
      kinds(
        merge({
          scanned: [scanned(8081, "shop"), scanned(8082, "shop")],
          registry: [atPort(8082)],
        }),
      ),
    ).toEqual([
      [8081, false, null],
      [8082, true, "Task 1 login fix"],
    ]);
  });

  test("an announcement for a port the scan did not find names no other server", () => {
    expect(
      kinds(
        merge({ scanned: [scanned(8081, "shop")], registry: [atPort(8085)] }),
      ),
    ).toEqual([[8081, false, null]]);
  });

  test("the same port on another machine is not the announced one", () => {
    const lan = { ...scanned(8081, "shop"), host: "192.168.1.24" };
    expect(
      kinds(
        merge({
          scanned: [scanned(8081, "shop"), lan],
          registry: [atPort(8081)],
          registryHost: "127.0.0.1",
        }),
      ),
    ).toEqual([
      [8081, true, "Task 1 login fix"],
      [8081, false, null],
    ]);
  });
});

test("a server Bonjour found says which computer it is on, and two on 8081 are two rows", () => {
  const at = (host: string) => ({ ...scanned(8081, "shop"), host });
  const servers = merge({
    scanned: [at("192.168.1.30"), at("192.168.1.31")],
    remote: [
      {
        host: "192.168.1.30",
        machine: "qa-mac",
        servers: [registered(8081, {})],
      },
      {
        host: "192.168.1.31",
        machine: "ci-mac",
        servers: [registered(8081, {})],
      },
    ],
  });
  expect(servers.map((s) => [s.hostPort, s.machine, s.announced])).toEqual([
    ["192.168.1.30:8081", "qa-mac", true],
    ["192.168.1.31:8081", "ci-mac", true],
  ]);
});
