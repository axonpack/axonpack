import { createServer } from "node:net";

import { freePort, registration } from "./start";

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
      plugins: [["@axonpack/preview-ready", { compatibility: "fingerprint" }]],
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
