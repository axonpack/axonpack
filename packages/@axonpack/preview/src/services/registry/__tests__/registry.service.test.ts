import { request } from "node:http";
import type { AddressInfo } from "node:net";

import {
  REGISTRY_VERSION,
  type RegisteredServer,
} from "../../../constants/dev-preview-servers/dev-preview-servers.const";
import { ServerList, createRegistry } from "../registry.service";

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
    ).toBe(200);
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

test("says which computer it is, and passes every change on", async () => {
  const changes: string[][] = [];
  const { server: http } = createRegistry({
    machine: { id: "m1", name: "qa-mac", addresses: ["192.168.1.24"] },
    onChange: (servers) => changes.push(servers.map((s) => s.id)),
  });
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  try {
    await call(base, "POST", "/servers", JSON.stringify(server("run-1", 8083)));
    expect((await call(base, "GET", "/servers")).json()).toMatchObject({
      machineId: "m1",
      addresses: ["192.168.1.24"],
    });
    await call(base, "DELETE", "/servers/run-1");
    expect(changes.slice(0, 2)).toEqual([["run-1"], []]);
  } finally {
    await new Promise((resolve) => http.close(resolve));
  }
});

test("answers a heartbeat with its version and why announcing fails", async () => {
  const { server: http } = createRegistry({
    announceError: () => "send EHOSTUNREACH 224.0.0.251:5353",
  });
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  try {
    const heartbeat = await call(
      base,
      "POST",
      "/servers",
      JSON.stringify(server("run-1", 8083)),
    );
    expect(heartbeat.json()).toMatchObject({
      version: REGISTRY_VERSION,
      announceError: "send EHOSTUNREACH 224.0.0.251:5353",
    });
    expect((await call(base, "GET", "/servers")).json().version).toBe(
      REGISTRY_VERSION,
    );
  } finally {
    await new Promise((resolve) => http.close(resolve));
  }
});

test("an older preview start's register, heartbeat and goodbye still work", async () => {
  const { server: http } = createRegistry();
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
  // The body `main`'s `preview start` posts every 5 s, which ignores the answer.
  const old = JSON.stringify(server("8082-1a2b3c4d", 8082));
  try {
    expect((await call(base, "POST", "/servers", old)).status).toBe(200);
    expect((await call(base, "POST", "/servers", old)).status).toBe(200);
    expect(
      (await call(base, "GET", "/servers"))
        .json()
        .servers.map((s: RegisteredServer) => s.id),
    ).toEqual(["8082-1a2b3c4d"]);
    expect((await call(base, "DELETE", "/servers/8082-1a2b3c4d")).status).toBe(
      204,
    );
    expect((await call(base, "GET", "/servers")).json().servers).toEqual([]);
  } finally {
    await new Promise((resolve) => http.close(resolve));
  }
});
