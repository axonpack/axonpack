import { createServer as createHttpServer, type Server } from "node:http";
import { createServer } from "node:net";

import { freePort, metroPort, registration } from "../start.service";

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
