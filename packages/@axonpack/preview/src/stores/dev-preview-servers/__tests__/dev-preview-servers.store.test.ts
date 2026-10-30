import { AppState, TurboModuleRegistry } from "react-native";

import { devPreviewServersStore } from "../dev-preview-servers.store";
import type { NativeState } from "../../../services/native/native.service";

jest.mock("expo-file-system", () =>
  require("../../../services/previews/__tests__/fake-file-system.test-helper"),
);
let mockScriptUrl: string | null = null;
const realGet = TurboModuleRegistry.get;
jest
  .spyOn(TurboModuleRegistry, "get")
  .mockImplementation(((name: string) =>
    name === "SourceCode"
      ? { getConstants: () => ({ scriptURL: mockScriptUrl }) }
      : realGet(name)) as typeof TurboModuleRegistry.get);
let mockNativeState: NativeState = {};
jest.mock("expo", () => ({
  requireOptionalNativeModule: () => ({
    key: "version-1.0.0",
    compatibility: "appVersion",
    slug: "shop",
    state: () => mockNativeState,
  }),
}));

const RANGE = Array.from({ length: 19 }, (_, i) => 8081 + i);

/** Metro answers as this app on these ports. Every other port refuses. */
let up = new Set<number>();
/** The ports the `preview start` registry announces, or null when it is not running. */
let registry: number[] | null = null;
let asked: string[] = [];
const answer = (body: unknown) =>
  ({
    text: async () => String(body),
    json: async () => body,
  }) as Response;
const refused = () => {
  throw new TypeError("Network request failed");
};
global.fetch = jest.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  asked.push(url);
  if (url.endsWith(":19150/servers"))
    return registry
      ? answer({
          servers: registry.map((port) => ({
            id: String(port),
            port,
            title: "Login fix",
            branch: "task-1",
            worktree: "/w",
            slug: "shop",
            name: "Shop",
            compatibility: "appVersion",
            keys: { ios: "version-1.0.0" },
            startedAt: "",
          })),
        })
      : refused();
  const port = Number(/:(\d+)\//.exec(url)?.[1]);
  if (!up.has(port)) refused();
  if (url.endsWith("/status")) return answer("packager-status:running");
  return answer({
    launchAsset: { url: `http://localhost:${port}/index.bundle?platform=ios` },
    extra: { expoClient: { slug: "shop", name: "Shop", version: "1.0.0" } },
  });
}) as typeof fetch;

/** The ports asked for Metro's status since the last call, sorted. */
const probed = () => {
  const ports = asked
    .filter((url) => url.endsWith("/status"))
    .map((url) => Number(/:(\d+)\/status$/.exec(url)![1]));
  asked = [];
  return ports.sort((a, b) => a - b);
};
const listed = () =>
  devPreviewServersStore.getState().servers.map((server) => server.port);
const alivePorts = () =>
  devPreviewServersStore
    .getState()
    .alive?.map((hostPort) => Number(hostPort.split(":").pop()));

// Real turns of the event loop, so a round started by a fake timer runs to its end.
const settle = async () => {
  for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r));
};
const wait = async (ms: number) => {
  await jest.advanceTimersByTimeAsync(ms);
  await settle();
};

const appState = AppState as unknown as { currentState: unknown };
const realState = appState.currentState;
const onAppState = () => {
  const { calls } = (AppState.addEventListener as jest.Mock).mock;
  return calls[calls.length - 1][1] as (next: string) => void;
};

let stop: () => void = () => undefined;
const watch = async () => {
  stop = devPreviewServersStore.watch();
  await settle();
};

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ["setImmediate"] });
  mockScriptUrl = null;
  mockNativeState = {};
  up = new Set([8081]);
  registry = null;
  appState.currentState = realState;
  asked = [];
});

afterEach(async () => {
  stop();
  stop = () => undefined;
  await settle();
  jest.useRealTimers();
});

test("the first mount sweeps the range and asks the registry", async () => {
  await watch();
  expect(asked).toContain("http://localhost:19150/servers");
  expect(probed()).toEqual(RANGE);
  expect(listed()).toEqual([8081]);
});

test("a 2 s tick asks the registry and only the ports known", async () => {
  up = new Set([8081, 8085]);
  await watch();
  probed();
  await wait(2000);
  expect(asked.filter((url) => url.endsWith(":19150/servers"))).toHaveLength(1);
  expect(probed()).toEqual([8081, 8085]);
  await wait(2000);
  expect(probed()).toEqual([8081, 8085]);
  expect(listed()).toEqual([8081, 8085]);
});

test("scanning is true during a sweep only, never during a quick tick", async () => {
  stop = devPreviewServersStore.watch();
  expect(devPreviewServersStore.getState().scanning).toBe(true);
  await settle();
  expect(devPreviewServersStore.getState().scanning).toBe(false);
  const seen: boolean[] = [];
  const off = devPreviewServersStore.subscribe(() =>
    seen.push(devPreviewServersStore.getState().scanning),
  );
  await wait(2000);
  expect(seen).not.toContain(true);
  const refreshed = devPreviewServersStore.refresh();
  expect(devPreviewServersStore.getState().scanning).toBe(true);
  await refreshed;
  expect(devPreviewServersStore.getState().scanning).toBe(false);
  off();
});

test("the range is swept again after 30 s, and not before", async () => {
  await watch();
  probed();
  await wait(28000);
  expect(new Set(probed())).toEqual(new Set([8081]));
  await wait(2000);
  expect(probed()).toEqual(RANGE);
  await wait(2000);
  expect(probed()).toEqual([8081]);
});

test("refresh sweeps the range, and the next automatic sweep is 30 s after it", async () => {
  await watch();
  await wait(20000);
  probed();
  await devPreviewServersStore.refresh();
  expect(probed()).toEqual(RANGE);
  // 40 s after the first sweep, but only 20 s after the refresh.
  await wait(20000);
  expect(new Set(probed())).toEqual(new Set([8081]));
  await wait(10000);
  expect(probed()).toContain(8099);
});

test("a refresh during a sweep waits for it and starts no second sweep", async () => {
  stop = devPreviewServersStore.watch();
  const second = devPreviewServersStore.refresh();
  const third = devPreviewServersStore.refresh();
  await Promise.all([second, third]);
  await settle();
  expect(probed()).toEqual(RANGE);
});

test("a refresh during a quick round sweeps once that round ends", async () => {
  await watch();
  probed();
  // Synchronously, so the tick's round is still running when refresh is asked.
  jest.advanceTimersByTime(2000);
  await devPreviewServersStore.refresh();
  expect(probed()).toEqual([...RANGE, 8081].sort((a, b) => a - b));
});

test("nothing is asked while the app is in the background, and one quick round on return", async () => {
  await watch();
  probed();
  appState.currentState = "background";
  onAppState()("background");
  await wait(60000);
  expect(asked).toEqual([]);
  appState.currentState = "active";
  onAppState()("active");
  await settle();
  expect(probed()).toEqual([8081]);
});

test("a server a sweep finds is asked on quick ticks until it stops answering", async () => {
  await watch();
  probed();
  up.add(8090);
  await wait(2000);
  // A plain `expo start` after the sweep: not asked, so not listed yet.
  expect(probed()).toEqual([8081]);
  expect(listed()).toEqual([8081]);
  await devPreviewServersStore.refresh();
  expect(listed()).toEqual([8081, 8090]);
  probed();
  await wait(2000);
  expect(probed()).toEqual([8081, 8090]);
  up.delete(8090);
  await wait(2000);
  expect(probed()).toEqual([8081, 8090]);
  expect(listed()).toEqual([8081]);
  await wait(2000);
  expect(probed()).toEqual([8081]);
});

test("a preview start server shows and goes within one quick tick, through the registry", async () => {
  await watch();
  registry = [8095];
  up.add(8095);
  probed();
  await wait(2000);
  expect(probed()).toEqual([8081, 8095]);
  expect(listed()).toEqual([8081, 8095]);
  expect(devPreviewServersStore.getState().servers[1]).toMatchObject({
    title: "Login fix",
    announced: true,
  });
  registry = [];
  up.delete(8095);
  await wait(2000);
  expect(listed()).toEqual([8081]);
});

test("the running server and the default Metro are asked on every tick, even while down", async () => {
  mockScriptUrl = "http://127.0.0.1:8083/index.bundle?platform=ios";
  mockNativeState = {
    localServer: mockScriptUrl,
    defaultServer: "localhost:8082",
  };
  up = new Set([8083]);
  await watch();
  expect(alivePorts()).toEqual([8083]);
  up = new Set();
  probed();
  await wait(2000);
  // Each once: the running server is not asked a second time when the scan covers it.
  expect(probed()).toEqual([8082, 8083]);
  // Gone, but the app runs from it, so it stays listed and shows offline.
  expect(alivePorts()).toEqual([]);
  expect(listed()).toEqual([8083]);
  await wait(2000);
  expect(probed()).toEqual([8082, 8083]);
  up = new Set([8083]);
  await wait(2000);
  expect(alivePorts()).toEqual([8083]);
});

test("nothing is asked once nothing watches", async () => {
  await watch();
  stop();
  stop = () => undefined;
  await settle();
  asked = [];
  await wait(60000);
  expect(asked).toEqual([]);
});
