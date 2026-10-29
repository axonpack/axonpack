import type { DevPreviewServer } from "../../dev-preview-servers/merge-servers.util";
import type { PreviewItem } from "../preview-items.util";
import { DEFAULT_LABELS } from "../../../constants/preview-list/theme.const";
import {
  displayHostPort,
  runningKind,
  runningLabel,
  runningNow,
  sameServer,
} from "../running.util";

const item = (id: string, title: string, active: boolean) =>
  ({ id, entry: { title }, active }) as unknown as PreviewItem;
const server = {
  url: "http://10.0.2.2:8082/index.bundle?platform=android",
  hostPort: "10.0.2.2:8082",
  title: "Task 2",
  branch: "task-2",
} as DevPreviewServer;

test("nothing picked is the base bundle", () => {
  expect(
    runningNow({ items: [], activeId: null, localUrl: null, servers: [] }),
  ).toEqual({
    kind: "base",
    source: "built-in",
    url: null,
    hostPort: null,
    server: null,
  });
});

test("a picked preview gives its title and id", () => {
  expect(
    runningNow({
      items: [item("task-1", "Task 1 login fix", true)],
      activeId: "task-1",
      localUrl: null,
      servers: [],
    }),
  ).toEqual({ kind: "preview", id: "task-1", title: "Task 1 login fix" });
});

test("a preview the list no longer has falls back to its id", () => {
  expect(
    runningNow({ items: [], activeId: "gone", localUrl: null, servers: [] }),
  ).toEqual({ kind: "preview", id: "gone", title: "gone" });
});

test("a dev preview server wins over a picked preview", () => {
  expect(
    runningNow({
      items: [item("task-1", "Task 1", true)],
      activeId: "task-1",
      localUrl: server.url,
      servers: [server],
    }),
  ).toEqual({
    kind: "local",
    url: server.url,
    hostPort: "10.0.2.2:8082",
    server,
  });
});

test("a dev preview server not found yet still gives its host and port", () => {
  expect(
    runningNow({
      items: [],
      activeId: null,
      localUrl: "http://localhost:8083/index.bundle?platform=ios",
      servers: [],
    }),
  ).toEqual({
    kind: "local",
    url: "http://localhost:8083/index.bundle?platform=ios",
    hostPort: "localhost:8083",
    server: null,
  });
});

const metro = (hostPort: string, extra: Partial<DevPreviewServer> = {}) =>
  ({
    hostPort,
    host: hostPort.split(":")[0],
    port: Number(hostPort.split(":")[1]),
    url: `http://${hostPort}/index.bundle?platform=ios`,
    title: "Main-Branch",
    branch: "main",
    announced: false,
    ...extra,
  }) as DevPreviewServer;

const onBase = (scriptUrl: string | null, servers: DevPreviewServer[] = []) =>
  runningNow({ items: [], activeId: null, localUrl: null, servers, scriptUrl });

describe("sameServer", () => {
  test.each([
    ["localhost:8081", "127.0.0.1:8081"],
    ["127.0.0.1:8081", "10.0.2.2:8081"],
    ["10.0.2.2:8081", "localhost:8081"],
    ["[::1]:8081", "localhost:8081"],
    ["LOCALHOST:8081", "localhost:8081"],
    ["192.168.1.5:8081", "192.168.1.5:8081"],
  ])("%s is the same server as %s", (a, b) => {
    expect(sameServer(a, b)).toBe(true);
  });

  test("another port is another server, even on the same computer", () => {
    expect(sameServer("localhost:8081", "localhost:8082")).toBe(false);
    expect(sameServer("10.0.2.2:8081", "127.0.0.1:8082")).toBe(false);
  });

  test("a LAN address is not taken for the computer's local names", () => {
    expect(sameServer("192.168.1.5:8081", "localhost:8081")).toBe(false);
  });
});

describe("the base's source", () => {
  test("a release build with no Metro runs the bundle built into the app", () => {
    expect(onBase("file:///app/Main.app/main.jsbundle")).toMatchObject({
      kind: "base",
      source: "built-in",
      hostPort: null,
    });
    expect(onBase("assets://index.android.bundle")).toMatchObject({
      source: "built-in",
    });
  });

  test("Metro that the registry does not know is Expo's dev server", () => {
    const scan = metro("localhost:8081");
    expect(
      onBase("http://localhost:8081/index.bundle?platform=ios", [scan]),
    ).toEqual({
      kind: "base",
      source: "expo-dev-server",
      url: "http://localhost:8081/index.bundle?platform=ios",
      hostPort: "localhost:8081",
      server: scan,
    });
  });

  test("Metro not found by the scan yet is still Expo's dev server", () => {
    expect(onBase("http://192.168.1.5:8081/index.bundle")).toMatchObject({
      source: "expo-dev-server",
      hostPort: "192.168.1.5:8081",
      server: null,
    });
  });

  test("an announced Metro is a dev preview server, matched under another host name", () => {
    const announced = metro("10.0.2.2:8082", { announced: true });
    expect(
      onBase("http://localhost:8082/index.bundle?platform=android", [
        metro("10.0.2.2:8081"),
        announced,
      ]),
    ).toMatchObject({ source: "dev-preview-server", server: announced });
  });

  test("a server on another port is not taken for the base", () => {
    expect(
      onBase("http://localhost:8081/index.bundle", [
        metro("localhost:8082", { announced: true }),
      ]),
    ).toMatchObject({ source: "expo-dev-server", server: null });
  });
});

describe("a preview", () => {
  test("runs when its own file is what loaded", () => {
    expect(
      runningNow({
        items: [item("task-1", "Task 1", true)],
        activeId: "task-1",
        localUrl: null,
        servers: [],
        scriptUrl: "file:///Users/x/Documents/preview/task-1/ios/main.jsbundle",
      }),
    ).toEqual({ kind: "preview", id: "task-1", title: "Task 1" });
  });

  test("picked but not loaded (the fallback ran) leaves the base", () => {
    expect(
      runningNow({
        items: [item("task-1", "Task 1", true)],
        activeId: "task-1",
        localUrl: null,
        servers: [],
        scriptUrl: "http://localhost:8081/index.bundle",
      }),
    ).toMatchObject({ kind: "base", source: "expo-dev-server" });
  });
});

test("a picked dev preview server takes its host and port from what loaded", () => {
  const picked = metro("127.0.0.1:8082", { announced: true });
  expect(
    runningNow({
      items: [],
      activeId: null,
      localUrl: "http://other-name:8082/index.bundle",
      servers: [picked],
      scriptUrl: "http://localhost:8082/index.bundle",
    }),
  ).toMatchObject({
    kind: "local",
    hostPort: "127.0.0.1:8082",
    server: picked,
  });
});

describe("runningLabel", () => {
  const label = (r: Parameters<typeof runningLabel>[0]) =>
    runningLabel(r, DEFAULT_LABELS);

  test("says what serves the app's own bundle, with no word for 'base'", () => {
    expect(label(onBase(null))).toBe("Built into the app");
    expect(label(onBase("http://127.0.0.1:8081/index.bundle"))).toBe(
      "Expo dev server, localhost:8081",
    );
    expect(
      label(
        onBase("http://localhost:8082/index.bundle", [
          metro("localhost:8082", { announced: true }),
        ]),
      ),
    ).toBe("Dev preview server, Main-Branch, localhost:8082");
  });

  test("a picked server and a preview", () => {
    expect(
      label({
        kind: "local",
        url: "http://127.0.0.1:8082/x",
        hostPort: "127.0.0.1:8082",
        server: metro("127.0.0.1:8082", { announced: true }),
      }),
    ).toBe("Dev preview server, Main-Branch, localhost:8082");
    expect(label({ kind: "preview", id: "t", title: "Login fix" })).toBe(
      "Preview, Login fix",
    );
  });

  test("a picked server the registry never announced is a plain Expo one", () => {
    expect(
      runningKind(
        {
          kind: "local",
          url: "http://localhost:8084/x",
          hostPort: "localhost:8084",
          server: metro("localhost:8084"),
        },
        DEFAULT_LABELS,
      ),
    ).toBe("Expo dev server");
  });

  test("custom labels are used", () => {
    expect(
      runningLabel(onBase(null), {
        ...DEFAULT_LABELS,
        kindBuiltIn: "In the app",
      }),
    ).toBe("In the app");
  });
});

describe("displayHostPort", () => {
  test.each([
    ["127.0.0.1:8083", "localhost:8083"],
    ["[::1]:8081", "localhost:8081"],
    ["localhost:8081", "localhost:8081"],
    ["10.0.2.2:8081", "10.0.2.2:8081"],
    ["192.168.1.5:8081", "192.168.1.5:8081"],
  ])("%s reads as %s", (from, to) => {
    expect(displayHostPort(from)).toBe(to);
  });
});
