import { File } from "expo-file-system";
import { AppState, TurboModuleRegistry } from "react-native";

import { devPreviewServersStore } from "../dev-preview-servers.store";
import type { NativeState } from "../../../services/native/native.service";
import { rootDirectory } from "../../../services/previews/local-previews.service";
import { devServersSetup } from "../../../utils/config/config.util";
import {
  type BonjourService,
  txtOf,
} from "../../../utils/dev-preview-servers/bonjour.util";

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
/** Native's Bonjour listener while it browses, or null. */
let mockBonjour: ((event: { services: BonjourService[] }) => void) | null =
  null;
const mockBrowse = { start: jest.fn(), stop: jest.fn() };
jest.mock("expo", () => ({
  requireOptionalNativeModule: () => ({
    key: "version-1.0.0",
    compatibility: "appVersion",
    slug: "shop",
    state: () => mockNativeState,
    startBonjourBrowse: mockBrowse.start,
    stopBonjourBrowse: mockBrowse.stop,
    addListener: (
      _event: string,
      listener: (event: { services: BonjourService[] }) => void,
    ) => {
      mockBonjour = listener;
      return { remove: () => (mockBonjour = null) };
    },
  }),
}));

const RANGE = Array.from({ length: 19 }, (_, i) => 8081 + i);

/** Metro answers as this app on these ports. Every other port refuses. */
let up = new Set<number>();
/** The ports the `preview start` registry announces, or null when it is not running. */
let registry: number[] | null = null;
/**
 * Other computers by host: the ports their registry announces (null when it is not running), and
 * the ports Metro answers on as this app.
 */
let machines: Record<string, { registry: number[] | null; up: number[] }> = {};
/** The ports `adb reverse` forwards, so localhost reaches only these. Null: all of them. */
let reverse: number[] | null = null;
let asked: string[] = [];
const answer = (body: unknown) =>
  ({
    text: async () => String(body),
    json: async () => body,
  }) as Response;
const refused = () => {
  throw new TypeError("Network request failed");
};
/** This computer is "this-mac" at 192.168.1.10 on the LAN; another one is named by its host. */
const announce = (ports: number[], host: string) =>
  answer({
    ...(host in machines
      ? { machineId: host }
      : { machineId: "this-mac", addresses: ["192.168.1.10"] }),
    servers: ports.map((port) => ({
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
  });
global.fetch = jest.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  asked.push(url);
  const [, host, port] = /^http:\/\/([^/:]+):(\d+)\//.exec(url)!;
  if (host === "localhost" && reverse && !reverse.includes(Number(port)))
    refused();
  const machine = machines[host] ?? { registry, up: [...up] };
  if (url.endsWith(":19150/servers"))
    return machine.registry ? announce(machine.registry, host) : refused();
  if (!machine.up.includes(Number(port))) refused();
  if (url.endsWith("/status")) return answer("packager-status:running");
  return answer({
    launchAsset: { url: `http://${host}:${port}/index.bundle?platform=ios` },
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
const listedAt = () =>
  devPreviewServersStore.getState().servers.map((server) => server.hostPort);
const hostsFile = () => new File(rootDirectory(), "hosts.json");
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
  machines = {};
  reverse = null;
  devPreviewServersStore.configure(devServersSetup(true));
  hostsFile().delete();
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
  registry = [];
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
  registry = [];
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

describe("a registry that does not answer", () => {
  const registryAsks = (host = "localhost") => {
    const count = asked.filter(
      (url) => url === `http://${host}:19150/servers`,
    ).length;
    asked = [];
    return count;
  };

  test("is asked on full sweeps only, and every 2 s again once it answers", async () => {
    await watch();
    expect(registryAsks()).toBe(1);
    await wait(2000);
    await wait(2000);
    expect(registryAsks()).toBe(0);
    // preview start runs now, but the quick look does not ask until a sweep.
    registry = [8095];
    up.add(8095);
    await wait(2000);
    expect(registryAsks()).toBe(0);
    expect(listed()).toEqual([8081]);
    await devPreviewServersStore.refresh();
    expect(registryAsks()).toBe(1);
    expect(listed()).toEqual([8081, 8095]);
    await wait(2000);
    expect(registryAsks()).toBe(1);
    // It stops: skipped again after one refusal.
    registry = null;
    await wait(2000);
    expect(registryAsks()).toBe(1);
    await wait(2000);
    expect(registryAsks()).toBe(0);
  });

  test("on another computer, waits for the 30 s sweep the same way", async () => {
    const LAN = "192.168.1.30";
    devPreviewServersStore.configure(devServersSetup({ hosts: [LAN] }));
    machines[LAN] = { registry: null, up: [8082] };
    await watch();
    expect(registryAsks(LAN)).toBe(1);
    machines[LAN].registry = [8082];
    await wait(26000);
    expect(registryAsks(LAN)).toBe(0);
    expect(listed()).toEqual([8081]);
    await wait(4000);
    expect(registryAsks(LAN)).toBe(1);
    expect(listed()).toEqual([8081, 8082]);
    await wait(2000);
    expect(registryAsks(LAN)).toBe(1);
  });

  test("a host added again is asked at once", async () => {
    const LAN = "192.168.1.30";
    machines[LAN] = { registry: null, up: [8082] };
    await watch();
    await devPreviewServersStore.addHost({ host: LAN, port: 19150 });
    await devPreviewServersStore.removeHost({ host: LAN, port: 19150 });
    machines[LAN].registry = [8082];
    asked = [];
    await devPreviewServersStore.addHost({ host: LAN, port: 19150 });
    expect(registryAsks(LAN)).toBe(1);
    expect(listed()).toEqual([8081, 8082]);
  });
});

describe("other computers", () => {
  const LAN = "192.168.1.30";
  const onHost = (host: string) =>
    asked.filter((url) => url.startsWith(`http://${host}:`));

  test("a preview start server there shows with its host, and its registry is asked every 2 s", async () => {
    devPreviewServersStore.configure(devServersSetup({ hosts: [LAN] }));
    machines[LAN] = { registry: [8082], up: [8082] };
    await watch();
    expect(listedAt()).toEqual(["localhost:8081", `${LAN}:8082`]);
    expect(devPreviewServersStore.getState().servers[1]).toMatchObject({
      host: LAN,
      title: "Login fix",
      announced: true,
      url: `http://${LAN}:8082/index.bundle?platform=ios`,
    });
    asked = [];
    await wait(2000);
    expect(onHost(LAN)).toEqual([
      `http://${LAN}:19150/servers`,
      `http://${LAN}:8082/status`,
    ]);
    // Its port is not asked on this computer.
    expect(probed()).toEqual([8081, 8082]);
    expect(asked).not.toContain("http://localhost:8082/status");
  });

  test("a plain expo start there never shows, and its ports are never scanned", async () => {
    devPreviewServersStore.configure(devServersSetup({ hosts: [LAN] }));
    machines[LAN] = { registry: [], up: [8081, 8083] };
    await watch();
    await devPreviewServersStore.refresh();
    expect(listedAt()).toEqual(["localhost:8081"]);
    expect(new Set(onHost(LAN))).toEqual(
      new Set([`http://${LAN}:19150/servers`]),
    );
  });

  test("two computers on the same port are two rows", async () => {
    registry = [8081];
    devPreviewServersStore.configure(devServersSetup({ hosts: [LAN] }));
    machines[LAN] = { registry: [8081], up: [8081] };
    await watch();
    expect(listedAt()).toEqual(["localhost:8081", `${LAN}:8081`]);
    await wait(2000);
    expect(listedAt()).toEqual(["localhost:8081", `${LAN}:8081`]);
  });

  test("a host on another registry port is asked on that port", async () => {
    devPreviewServersStore.configure(
      devServersSetup({ hosts: [`${LAN}:19151`] }),
    );
    await watch();
    expect(onHost(LAN)).toEqual([`http://${LAN}:19151/servers`]);
  });

  test("the app's hosts that are not hosts are skipped with a warning", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    devPreviewServersStore.configure(
      devServersSetup({ hosts: [LAN, "not a host", "localhost"] }),
    );
    expect(warn.mock.calls.map(([text]) => text)).toEqual([
      '@axonpack/preview: devPreviewServers.hosts skips "not a host": it is not an IP address or a host name.',
      '@axonpack/preview: devPreviewServers.hosts skips "localhost": it is always checked.',
    ]);
    warn.mockRestore();
  });
});

describe("hosts added on the device", () => {
  const LAN = "192.168.1.30";
  const sources = () =>
    devPreviewServersStore
      .getState()
      .hosts.map((h) => `${h.source} ${h.host}:${h.port}`);

  test("are read on mount, after this computer's names and the app's hosts", async () => {
    await hostsFile().write(JSON.stringify([LAN, "bad host"]));
    devPreviewServersStore.configure(
      devServersSetup({ hosts: ["qa-mac.local"] }),
    );
    machines[LAN] = { registry: [8084], up: [8084] };
    await watch();
    expect(sources()).toEqual([
      "built-in localhost:19150",
      "built-in 127.0.0.1:19150",
      "app qa-mac.local:19150",
      `user ${LAN}:19150`,
    ]);
    expect(listedAt()).toContain(`${LAN}:8084`);
  });

  test("are saved when one is added or removed, and a removed one's servers go", async () => {
    machines[LAN] = { registry: [8084], up: [8084] };
    await watch();
    await devPreviewServersStore.addHost({ host: LAN, port: 19150 });
    await devPreviewServersStore.addHost({ host: "qa-mac.local", port: 19151 });
    expect(JSON.parse(await hostsFile().text())).toEqual([
      LAN,
      "qa-mac.local:19151",
    ]);
    expect(listedAt()).toContain(`${LAN}:8084`);
    await devPreviewServersStore.removeHost({ host: LAN, port: 19150 });
    expect(JSON.parse(await hostsFile().text())).toEqual([
      "qa-mac.local:19151",
    ]);
    await wait(2000);
    expect(listedAt()).toEqual(["localhost:8081"]);
    expect(sources()).not.toContain(`user ${LAN}:19150`);
  });

  test("are not asked when the app turns custom hosts off", async () => {
    await hostsFile().write(JSON.stringify([LAN]));
    devPreviewServersStore.configure(
      devServersSetup({ allowCustomHosts: false }),
    );
    machines[LAN] = { registry: [8084], up: [8084] };
    await watch();
    expect(sources()).not.toContain(`user ${LAN}:19150`);
    expect(asked.some((url) => url.includes(LAN))).toBe(false);
  });
});

describe("Bonjour", () => {
  /** A `preview start` server on `machineId`, at `host`, as native reports it. */
  const service = (
    host: string,
    machineId: string,
    port = 8081,
    slug = "shop",
  ): BonjourService => ({
    name: `preview-${machineId}-${port}`,
    host,
    port,
    txt: txtOf(
      {
        id: "x",
        port,
        title: "Signup",
        branch: "task-2",
        worktree: "/w",
        slug,
        name: "Shop",
        compatibility: "appVersion",
        keys: { ios: "version-1.0.0" },
        startedAt: "",
      },
      { id: machineId, name: `${machineId}-mac` },
      19150,
    ),
  });
  const found = async (services: BonjourService[]) => {
    mockBonjour?.({ services });
    await wait(2000);
  };

  let log: jest.SpyInstance;
  beforeEach(() => {
    mockBrowse.start.mockClear();
    mockBrowse.stop.mockClear();
    log = jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => log.mockRestore());

  test("another computer's preview start server shows with no host typed in, named by its computer", async () => {
    machines = { "192.168.1.30": { registry: null, up: [8081] } };
    await watch();
    await found([service("192.168.1.30", "qa")]);
    expect(listedAt()).toEqual(["localhost:8081", "192.168.1.30:8081"]);
    expect(devPreviewServersStore.getState().servers[1]).toMatchObject({
      title: "Signup",
      branch: "task-2",
      machine: "qa-mac",
      announced: true,
    });
    // Bonjour said everything; its registry is never asked.
    expect(asked).not.toContain("http://192.168.1.30:19150/servers");
  });

  test("another app's server is neither listed nor asked", async () => {
    machines = { "192.168.1.30": { registry: null, up: [8081] } };
    await watch();
    asked = [];
    await found([service("192.168.1.30", "qa", 8081, "other")]);
    expect(listedAt()).toEqual(["localhost:8081"]);
    expect(asked.some((url) => url.includes("192.168.1.30"))).toBe(false);
  });

  test("this computer's server, found by Bonjour too, is one row", async () => {
    registry = [8081];
    await watch();
    await found([service("192.168.1.10", "this-mac")]);
    expect(listedAt()).toEqual(["localhost:8081"]);
  });

  test("a new Bonjour server makes a registry that was down answer at once", async () => {
    await watch();
    // `preview start` runs now: its registry is up, and announces 8081.
    registry = [8081];
    await found([service("192.168.1.10", "this-mac")]);
    expect(listedAt()).toEqual(["localhost:8081"]);
    expect(devPreviewServersStore.getState().servers[0].announced).toBe(true);
  });

  test("this computer's server that adb reverse does not forward shows at its LAN address", async () => {
    // A phone on USB reaches Metro's 8081 and the registry through localhost, but not 8083.
    reverse = [8081, 19150];
    registry = [8081, 8083];
    up = new Set([8081, 8083]);
    await watch();
    expect(listedAt()).toEqual(["localhost:8081"]);
    await found([
      service("192.168.1.10", "this-mac", 8081),
      service("192.168.1.10", "this-mac", 8083),
    ]);
    // 8081 is one row, from localhost. 8083 is reached over Wi-Fi.
    expect(listedAt()).toEqual(["localhost:8081", "192.168.1.10:8083"]);
    expect(devPreviewServersStore.getState().servers[1]).toMatchObject({
      title: "Signup",
      announced: true,
      url: "http://192.168.1.10:8083/index.bundle?platform=ios",
    });
    await wait(2000);
    expect(listedAt()).toEqual(["localhost:8081", "192.168.1.10:8083"]);
  });

  test("this computer's server stays listed, at its LAN address, once the USB cable is pulled", async () => {
    reverse = [8081, 19150];
    registry = [8081];
    await watch();
    await found([service("192.168.1.10", "this-mac")]);
    expect(listedAt()).toEqual(["localhost:8081"]);
    // Its registry is still remembered, but localhost reaches nothing now.
    reverse = [];
    await wait(2000);
    expect(listedAt()).toEqual(["192.168.1.10:8081"]);
    expect(devPreviewServersStore.getState().servers[0]).toMatchObject({
      title: "Signup",
      announced: true,
    });
  });

  test("debug builds log once why a Bonjour server is not listed", async () => {
    machines = { "192.168.1.31": { registry: null, up: [] } };
    await watch();
    await found([
      service("192.168.1.31", "ci", 8081, "other"),
      service("192.168.1.31", "ci", 8082),
    ]);
    await wait(2000);
    expect(log.mock.calls.map(([text]) => text)).toEqual([
      '@axonpack/preview: Bonjour found "preview-ci-8081" at 192.168.1.31:8081, but it is not listed: it is for the app "other", and this app is "shop".',
      '@axonpack/preview: Bonjour found "preview-ci-8082" at 192.168.1.31:8082, but it is not listed: Metro did not answer there (is it running, and can this device reach that address?).',
    ]);
  });

  test("browses only while watched and in the foreground", async () => {
    await watch();
    expect(mockBrowse.start).toHaveBeenCalledTimes(1);
    onAppState()("background");
    expect(mockBrowse.stop).toHaveBeenCalledTimes(1);
    expect(mockBonjour).toBeNull();
    onAppState()("active");
    expect(mockBrowse.start).toHaveBeenCalledTimes(2);
    stop();
    expect(mockBrowse.stop).toHaveBeenCalledTimes(2);
  });
});
