import type { DevPreviewServer } from "../../dev-preview-servers/merge-servers.util";
import type { PreviewItem } from "../preview-items.util";
import { DEFAULT_LABELS } from "../../../constants/preview-list/theme.const";
import {
  displayHostPort,
  runningKind,
  runningLabel,
  runningNow,
  runningPreviewId,
  runsFromServer,
  sameServer,
  serverOnline,
} from "../running.util";

const item = (id: string, title: string, active: boolean) =>
  ({ id, entry: { title }, active }) as unknown as PreviewItem;
const server = {
  url: "http://10.0.2.2:8082/index.bundle?platform=android",
  hostPort: "10.0.2.2:8082",
  title: "Task 2",
  branch: "task-2",
} as DevPreviewServer;

test("nothing picked is the default bundle", () => {
  expect(
    runningNow({ items: [], activeId: null, localUrl: null, servers: [] }),
  ).toEqual({
    kind: "default",
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

const onDefault = (
  scriptUrl: string | null,
  servers: DevPreviewServer[] = [],
) =>
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

describe("the default's source", () => {
  test("a release build with no Metro runs the bundle built into the app", () => {
    expect(onDefault("file:///app/Main.app/main.jsbundle")).toMatchObject({
      kind: "default",
      source: "built-in",
      hostPort: null,
    });
    expect(onDefault("assets://index.android.bundle")).toMatchObject({
      source: "built-in",
    });
  });

  test("Metro that the registry does not know is Expo's dev server", () => {
    const scan = metro("localhost:8081");
    expect(
      onDefault("http://localhost:8081/index.bundle?platform=ios", [scan]),
    ).toEqual({
      kind: "default",
      source: "expo-dev-server",
      url: "http://localhost:8081/index.bundle?platform=ios",
      hostPort: "localhost:8081",
      server: scan,
    });
  });

  test("Metro not found by the scan yet is still Expo's dev server", () => {
    expect(onDefault("http://192.168.1.5:8081/index.bundle")).toMatchObject({
      source: "expo-dev-server",
      hostPort: "192.168.1.5:8081",
      server: null,
    });
  });

  test("an announced Metro is a dev preview server, matched under another host name", () => {
    const announced = metro("10.0.2.2:8082", { announced: true });
    expect(
      onDefault("http://localhost:8082/index.bundle?platform=android", [
        metro("10.0.2.2:8081"),
        announced,
      ]),
    ).toMatchObject({ source: "dev-preview-server", server: announced });
  });

  test("a server on another port is not taken for the default", () => {
    expect(
      onDefault("http://localhost:8081/index.bundle", [
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

  test("picked but not loaded (the fallback ran) leaves the default", () => {
    expect(
      runningNow({
        items: [item("task-1", "Task 1", true)],
        activeId: "task-1",
        localUrl: null,
        servers: [],
        scriptUrl: "http://localhost:8081/index.bundle",
      }),
    ).toMatchObject({ kind: "default", source: "expo-dev-server" });
  });
});

describe("what native says it loaded", () => {
  const scan = metro("localhost:8081");
  const now = (
    loaded: Parameters<typeof runningNow>[0]["loaded"],
    scriptUrl: string,
    choice: { activeId?: string; localUrl?: string } = {},
  ) =>
    runningNow({
      items: [item("task-1", "Task 1", false)],
      activeId: choice.activeId ?? null,
      localUrl: choice.localUrl ?? null,
      servers: [scan],
      scriptUrl,
      defaultServer: "localhost:8081",
      loaded,
    });

  test("a preview runs, whatever form the file's path takes", () => {
    expect(
      now({ kind: "preview", id: "task-1" }, "/data/files/x/task-1.bundle", {
        activeId: "task-1",
      }),
    ).toEqual({ kind: "preview", id: "task-1", title: "Task 1" });
  });

  test("a server runs, even one the list has not been told about", () => {
    expect(
      now(
        { kind: "server", url: "http://127.0.0.1:8082/index.bundle" },
        "http://127.0.0.1:8082/index.bundle",
      ),
    ).toMatchObject({ kind: "local", hostPort: "127.0.0.1:8082" });
  });

  test("a server that is the default Metro is still the default", () => {
    expect(
      now(
        { kind: "server", url: "http://127.0.0.1:8081/index.bundle" },
        "http://127.0.0.1:8081/index.bundle",
        { localUrl: "http://127.0.0.1:8081/index.bundle" },
      ),
    ).toMatchObject({ kind: "default", source: "expo-dev-server" });
  });

  test("the default runs, from Metro or built in", () => {
    expect(
      now({ kind: "default" }, "http://localhost:8081/index.bundle"),
    ).toMatchObject({
      kind: "default",
      source: "expo-dev-server",
      server: scan,
    });
    expect(
      now({ kind: "default" }, "file:///app/Main.app/main.jsbundle"),
    ).toMatchObject({ kind: "default", source: "built-in" });
  });

  test("a chosen preview that fell back to the default is not running", () => {
    // The file test alone would be fooled here: the preview's path is what loaded last time.
    expect(
      now(
        { kind: "default" },
        "file:///Documents/preview/task-1/ios/main.jsbundle",
        { activeId: "task-1" },
      ),
    ).toMatchObject({ kind: "default" });
  });

  test("a chosen preview under a picked server is not running", () => {
    expect(
      now(
        { kind: "server", url: "http://127.0.0.1:8081/index.bundle" },
        "http://127.0.0.1:8081/index.bundle",
        {
          activeId: "task-1",
          localUrl: "http://127.0.0.1:8081/index.bundle",
        },
      ),
    ).toMatchObject({ kind: "default", source: "expo-dev-server" });
  });

  test("a picked server that native did not load is not running", () => {
    expect(
      now({ kind: "preview", id: "task-1" }, "/data/x", {
        activeId: "task-1",
        localUrl: "http://127.0.0.1:8082/index.bundle",
      }),
    ).toMatchObject({ kind: "preview", id: "task-1" });
  });
});

describe("runningPreviewId", () => {
  test("takes what native loaded over the choice and the file", () => {
    expect(
      runningPreviewId({ activeId: "a", loaded: { kind: "preview", id: "b" } }),
    ).toBe("b");
    expect(
      runningPreviewId({
        activeId: "a",
        loaded: { kind: "default" },
        scriptUrl: "/files/preview/a/android/index.android.bundle",
      }),
    ).toBeNull();
  });

  test("without it (an older native side), the file must be the chosen preview's own", () => {
    expect(
      runningPreviewId({
        activeId: "a",
        scriptUrl:
          "/data/user/0/app/files/preview/a/android/index.android.bundle",
      }),
    ).toBe("a");
    expect(
      runningPreviewId({
        activeId: "a",
        loaded: null,
        scriptUrl: "http://localhost:8081/index.bundle",
      }),
    ).toBeNull();
    // Nothing to check against (tests, web): the choice stands.
    expect(runningPreviewId({ activeId: "a" })).toBe("a");
    expect(runningPreviewId({ activeId: null })).toBeNull();
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

describe("a server picked by hand", () => {
  const pick = (url: string, defaultServer: string | null) =>
    runningNow({
      items: [],
      activeId: null,
      localUrl: url,
      servers: [metro("localhost:8081")],
      scriptUrl: url,
      defaultServer,
    });

  test("that is the Metro the app starts on anyway is the default", () => {
    expect(
      pick("http://127.0.0.1:8081/index.bundle?platform=ios", "localhost:8081"),
    ).toMatchObject({
      kind: "default",
      source: "expo-dev-server",
      hostPort: "127.0.0.1:8081",
    });
    expect(
      pick(
        "http://localhost:8081/index.bundle?platform=android",
        "10.0.2.2:8081",
      ),
    ).toMatchObject({ kind: "default" });
  });

  test("on another port, or with the default unknown, is what runs", () => {
    expect(
      pick("http://127.0.0.1:8082/index.bundle", "localhost:8081"),
    ).toMatchObject({ kind: "local", hostPort: "127.0.0.1:8082" });
    expect(pick("http://127.0.0.1:8081/index.bundle", null)).toMatchObject({
      kind: "local",
    });
  });
});

describe("runningLabel", () => {
  const label = (r: Parameters<typeof runningLabel>[0]) =>
    runningLabel(r, DEFAULT_LABELS);

  test("says what serves the app's own bundle, with no word for 'base'", () => {
    expect(label(onDefault(null))).toBe("Built into the app");
    expect(
      label(
        onDefault("http://127.0.0.1:8081/index.bundle", [
          metro("localhost:8081"),
        ]),
      ),
    ).toBe("Expo server, localhost:8081");
    // Not found by any look yet, so it is not known to be either kind.
    expect(label(onDefault("http://127.0.0.1:8081/index.bundle"))).toBe(
      "Server, localhost:8081",
    );
    expect(
      label(
        onDefault("http://localhost:8082/index.bundle", [
          metro("localhost:8082", { announced: true }),
        ]),
      ),
    ).toBe("Preview server, Main-Branch, localhost:8082");
  });

  test("a picked server and a preview", () => {
    expect(
      label({
        kind: "local",
        url: "http://127.0.0.1:8082/x",
        hostPort: "127.0.0.1:8082",
        server: metro("127.0.0.1:8082", { announced: true }),
      }),
    ).toBe("Preview server, Main-Branch, localhost:8082");
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
    ).toBe("Expo server");
  });

  test("custom labels are used", () => {
    expect(
      runningLabel(onDefault(null), {
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

describe("runsFromServer", () => {
  test("the default Metro the app started on, under another name", () => {
    const running = onDefault("http://127.0.0.1:8081/index.bundle");
    expect(runsFromServer(running, "localhost:8081")).toBe(true);
    expect(runsFromServer(running, "10.0.2.2:8081")).toBe(true);
    expect(runsFromServer(running, "localhost:8082")).toBe(false);
  });

  test("a server picked by hand, and not the default Metro", () => {
    const running = runningNow({
      items: [],
      activeId: null,
      localUrl: "http://127.0.0.1:8082/index.bundle",
      servers: [],
      scriptUrl: "http://127.0.0.1:8082/index.bundle",
      defaultServer: "localhost:8081",
    });
    expect(runsFromServer(running, "localhost:8082")).toBe(true);
    expect(runsFromServer(running, "localhost:8081")).toBe(false);
  });

  test("none while a preview runs or the bundle is built in", () => {
    const preview = runningNow({
      items: [],
      activeId: "task-1",
      localUrl: null,
      servers: [],
      scriptUrl: "file:///data/preview/task-1/ios/main.jsbundle",
    });
    expect(runsFromServer(preview, "localhost:8081")).toBe(false);
    expect(runsFromServer(onDefault(null), "localhost:8081")).toBe(false);
  });
});

describe("serverOnline", () => {
  const onMetro = onDefault("http://localhost:8081/index.bundle?platform=ios");

  test("found in the last round, under any name for this computer", () => {
    expect(serverOnline(onMetro, ["127.0.0.1:8081", "localhost:8082"])).toBe(
      true,
    );
  });

  test("not found after a round is offline", () => {
    expect(serverOnline(onMetro, ["localhost:8082"])).toBe(false);
    expect(serverOnline(onMetro, [])).toBe(false);
  });

  test("unknown before the first round", () => {
    expect(serverOnline(onMetro, null)).toBeNull();
  });

  test("online again once a round finds it", () => {
    const rounds = [["localhost:8081"], [], ["localhost:8081"]];
    expect(rounds.map((alive) => serverOnline(onMetro, alive))).toEqual([
      true,
      false,
      true,
    ]);
  });

  test("a server picked by hand", () => {
    const picked = runningNow({
      items: [],
      activeId: null,
      localUrl: "http://127.0.0.1:8082/index.bundle",
      servers: [],
      scriptUrl: "http://127.0.0.1:8082/index.bundle",
      defaultServer: "localhost:8081",
    });
    expect(serverOnline(picked, ["localhost:8081"])).toBe(false);
    expect(serverOnline(picked, ["localhost:8082"])).toBe(true);
  });

  test("null when no server runs: a preview, or built into the app", () => {
    const preview = runningNow({
      items: [],
      activeId: "task-1",
      localUrl: null,
      servers: [],
      scriptUrl: "file:///data/preview/task-1/ios/main.jsbundle",
    });
    expect(serverOnline(preview, ["localhost:8081"])).toBeNull();
    expect(serverOnline(onDefault(null), ["localhost:8081"])).toBeNull();
  });
});
