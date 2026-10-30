import { execFileSync, spawn } from "node:child_process";
import { createServer as createHttpServer, type Server } from "node:http";
import { createServer } from "node:net";
import { resolve } from "node:path";

import {
  REGISTRY_VERSION,
  type RegisteredServer,
  type RegistryAnswer,
} from "../../../constants/dev-preview-servers/dev-preview-servers.const";
import {
  announceErrorNotice,
  ensureRegistry,
  freePort,
  metroPort,
  olderRegistry,
  registration,
} from "../start.service";

jest.mock("node:child_process", () => ({
  ...jest.requireActual("node:child_process"),
  execFileSync: jest.fn(),
  spawn: jest.fn(),
}));

test("skips a port something already listens on", async () => {
  const busy = createServer();
  await new Promise<void>((resolve) => busy.listen(0, resolve));
  const port = (busy.address() as { port: number }).port;
  try {
    expect(await freePort([port, port + 1])).toBe(port + 1);
  } finally {
    busy.close();
  }
});

test("skips a port another start has claimed but Metro has not bound yet", async () => {
  const free = await freePort([40000, 40100]);
  expect(await freePort([free, free + 100], new Set([free]))).toBeGreaterThan(
    free,
  );
});

test("announces the branch, slug and the keys publish would use", () => {
  const server = registration({
    config: {
      slug: "shop",
      name: "Shop",
      version: "2.1.0",
      ios: { bundleIdentifier: "com.shop", version: "2.1.1" },
      android: { package: "com.shop.app" },
    },
    port: 8083,
    branch: "task-1-login-fix",
    worktree: "/w/task-1",
  });
  expect(server).toMatchObject({
    port: 8083,
    title: "Task 1 login fix",
    slug: "shop",
    iosBundleIdentifier: "com.shop",
    androidPackage: "com.shop.app",
    compatibility: "appVersion",
    keys: { ios: "version-2.1.1", android: "version-2.1.0" },
  });
  expect(server.id).toMatch(/^8083-/);
});

test("in fingerprint mode the keys come from the fingerprints", () => {
  const server = registration({
    config: {
      slug: "s",
      plugins: [["@axonpack/preview", { compatibility: "fingerprint" }]],
    },
    port: 8081,
    branch: "",
    worktree: "/w",
    fingerprints: { android: "aa", ios: "bb" },
  });
  expect(server.keys).toEqual({
    android: "fingerprint-aa",
    ios: "fingerprint-bb",
  });
});

/** A Metro stand-in on a free port: `/status` names its project root, as Expo's does. */
async function metro(root: string): Promise<{ port: number; server: Server }> {
  const server = createHttpServer((_, res) => {
    res.setHeader("X-React-Native-Project-Root", encodeURI(root));
    res.end("packager-status:running");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { port: (server.address() as { port: number }).port, server };
}

describe("metroPort: where this project's Metro really answers", () => {
  const ours = __dirname;
  const range = (a: number, b: number): [number, number] => [
    Math.min(a, b),
    Math.max(a, b),
  ];

  test("on the port it was given", async () => {
    const { port, server } = await metro(ours);
    try {
      expect(await metroPort(ours, port, [port, port])).toBe(port);
    } finally {
      server.close();
    }
  });

  test("on another port when Expo moved, never on the given one that another project holds", async () => {
    const other = await metro("/somewhere/else");
    const moved = await metro(ours);
    try {
      expect(
        await metroPort(ours, other.port, range(other.port, moved.port)),
      ).toBe(moved.port);
    } finally {
      other.server.close();
      moved.server.close();
    }
  });

  test("null while it does not answer yet", async () => {
    const other = await metro("/somewhere/else");
    try {
      expect(await metroPort(ours, other.port, [other.port, other.port])).toBe(
        null,
      );
    } finally {
      other.server.close();
    }
  });
});

test("a registry with no version is older than any with one; an equal or newer one is not", () => {
  expect(olderRegistry({ servers: [] })).toBe(true);
  expect(olderRegistry({ servers: [], version: REGISTRY_VERSION - 1 })).toBe(
    true,
  );
  expect(olderRegistry({ servers: [], version: REGISTRY_VERSION })).toBe(false);
  expect(olderRegistry({ servers: [], version: REGISTRY_VERSION + 1 })).toBe(
    false,
  );
});

describe("ensureRegistry: replacing an older or hung registry", () => {
  // The way `ensureRegistry` starts one, through this package's real bin.
  const ours = `/usr/local/bin/node ${resolve(__dirname, "../../../../bin/preview.js")} registry --port 19150`;
  const old = (port: number, id = `${port}-old`) =>
    ({ id, port, title: id }) as RegisteredServer;

  let held: ReturnType<typeof createServer>;
  let port: number;
  let answer: RegistryAnswer | "hung" | null;
  let posted: RegisteredServer[];
  let metros: Set<number>;
  let lines: string[];
  let kill: jest.SpyInstance;
  const realFetch = global.fetch;

  /** Holds a real port, as the old registry does; the mocked kill lets it go. */
  beforeEach(async () => {
    held = createServer();
    await new Promise<void>((r) => held.listen(0, r));
    port = (held.address() as { port: number }).port;
    posted = [];
    metros = new Set();
    lines = [];
    jest.spyOn(process.stdout, "write").mockImplementation((line) => {
      lines.push(String(line));
      return true;
    });
    kill = jest.spyOn(process, "kill").mockImplementation(() => {
      held.close();
      return true;
    });
    (spawn as jest.Mock).mockImplementation(() => {
      answer = { servers: [], version: REGISTRY_VERSION };
      return { unref: () => undefined };
    });
    global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
      const { pathname, port: to } = new URL(url);
      if (pathname === "/status") {
        if (metros.has(Number(to))) return { ok: true };
        throw new Error("ECONNREFUSED");
      }
      if (init?.method === "POST") {
        posted.push(JSON.parse(String(init.body)));
        return { ok: true, json: async () => answer };
      }
      if (answer === "hung") throw new Error("The operation timed out.");
      if (!answer) throw new Error("ECONNREFUSED");
      const body = answer;
      return { ok: true, json: async () => body };
    }) as unknown as typeof fetch;
  });
  afterEach(() => {
    held.close();
    global.fetch = realFetch;
    jest.restoreAllMocks();
    (spawn as jest.Mock).mockReset();
    (execFileSync as jest.Mock).mockReset();
  });

  const listening = (command: string) =>
    (execFileSync as jest.Mock).mockImplementation((cmd: string) =>
      cmd === "lsof" ? "4242\n" : command,
    );

  test("stops a confirmed older registry and hands over the servers whose Metro answers", async () => {
    answer = { servers: [old(8082), old(8084)] };
    metros.add(8082);
    listening(ours);
    await ensureRegistry(port, "bin");
    expect(kill).toHaveBeenCalledWith(4242, "SIGTERM");
    expect(spawn).toHaveBeenCalled();
    expect(posted.map((s) => s.id)).toEqual(["8082-old"]);
    expect(lines.join("")).toContain(
      "Replaced an older preview registry (pid 4242), so this computer can be found on the network.",
    );
  });

  test("stops a registry that holds the port but doesn't answer", async () => {
    answer = "hung";
    listening(ours);
    await ensureRegistry(port, "bin");
    expect(kill).toHaveBeenCalledWith(4242, "SIGTERM");
    expect(spawn).toHaveBeenCalled();
    expect(lines.join("")).toContain(
      "Replaced a preview registry that had stopped answering (pid 4242).",
    );
  });

  test("never stops what isn't a preview registry, and says what it is", async () => {
    answer = { servers: [old(8082)] };
    listening("/usr/bin/python3 -m http.server 19150");
    await ensureRegistry(port, "bin");
    answer = "hung";
    await expect(ensureRegistry(port, "bin")).rejects.toThrow(
      `port ${port} is taken`,
    );
    expect(kill).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
    expect(lines.join("")).toContain(
      "Port " +
        port +
        " is held by pid 4242 (/usr/bin/python3 -m http.server 19150), which isn't a preview registry, so it was left running.",
    );
  });

  test("a registry that isn't a preview one by its script path is left running too", async () => {
    answer = { servers: [] };
    listening("node /tmp/elsewhere/preview registry --port 19150");
    await ensureRegistry(port, "bin");
    expect(kill).not.toHaveBeenCalled();
  });

  test("an equal or newer registry is used as it is", async () => {
    for (const version of [REGISTRY_VERSION, REGISTRY_VERSION + 1]) {
      answer = { servers: [old(8082)], version };
      await ensureRegistry(port, "bin");
    }
    expect(execFileSync).not.toHaveBeenCalled();
    expect(kill).not.toHaveBeenCalled();
    expect(spawn).not.toHaveBeenCalled();
  });
});

test("says once why announcing fails, with the macOS fix for a refused send", () => {
  const lines: string[] = [];
  jest.spyOn(process.stdout, "write").mockImplementation((line) => {
    lines.push(String(line));
    return true;
  });
  const platform = Object.getOwnPropertyDescriptor(process, "platform")!;
  Object.defineProperty(process, "platform", { value: "darwin" });
  try {
    const notice = announceErrorNotice();
    notice("send EHOSTUNREACH 224.0.0.251:5353");
    notice("send EHOSTUNREACH 224.0.0.251:5353");
    notice(undefined);
    expect(lines).toEqual([
      "preview: Phones on the network can't find this computer (send EHOSTUNREACH 224.0.0.251:5353). Allow your terminal app under System Settings > Privacy & Security > Local Network.\n",
    ]);
  } finally {
    Object.defineProperty(process, "platform", platform);
    jest.restoreAllMocks();
  }
});
