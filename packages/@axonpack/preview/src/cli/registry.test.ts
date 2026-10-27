import { request } from "node:http";
import type { AddressInfo } from "node:net";

import type { RegisteredServer } from "../core/dev-preview-servers";
import { ServerList, createRegistry } from "./registry";

const server = (id: string, port: number): RegisteredServer => ({
  id,
  port,
  title: id,
  branch: id,
  worktree: `/w/${id}`,
  slug: "app",
  name: "App",
  compatibility: "appVersion",
  keys: { android: "version-1.0.0", ios: "version-1.0.0" },
  startedAt: "t",
});

test("a server without a heartbeat for the TTL drops out", () => {
  const list = new ServerList(15000);
  list.upsert(server("a", 8082), 0);
  list.upsert(server("b", 8081), 0);
  expect(list.alive(10000).map((s) => s.port)).toEqual([8081, 8082]);
  list.upsert(server("a", 8082), 10000);
  expect(list.alive(20000).map((s) => s.id)).toEqual(["a"]);
  list.remove("a");
  expect(list.alive(20000)).toEqual([]);
});

// The React Native test environment has no real fetch, so this talks node:http directly.
const call = (base: string, method: string, path: string, body?: string) =>
  new Promise<{ status: number; json: () => any }>((resolve, reject) => {
    const req = request(`${base}${path}`, { method }, (res) => {
      let text = "";
      res.on("data", (chunk) => (text += chunk));
      res.on("end", () =>
        resolve({ status: res.statusCode ?? 0, json: () => JSON.parse(text) }),
      );
    });
    req.on("error", reject);
    req.end(body);
  });

test("registers, lists and removes over HTTP", async () => {
  const { server: http } = createRegistry();
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  try {
    expect(
      (
        await call(
          base,
          "POST",
          "/servers",
          JSON.stringify(server("run-1", 8083)),
        )
      ).status,
    ).toBe(204);
    expect(
      (await call(base, "GET", "/servers"))
        .json()
        .servers.map((s: RegisteredServer) => s.id),
    ).toEqual(["run-1"]);
    await call(base, "DELETE", "/servers/run-1");
    expect((await call(base, "GET", "/servers")).json().servers).toEqual([]);
    expect((await call(base, "POST", "/servers", "{}")).status).toBe(400);
  } finally {
    await new Promise((resolve) => http.close(resolve));
  }
});
