import type { RegisteredServer } from "../../../constants/dev-preview-servers/dev-preview-servers.const";
import {
  type BonjourService,
  type KnownMachine,
  bonjourRegistries,
  txtOf,
} from "../bonjour.util";

const registered: RegisteredServer = {
  id: "8081-x",
  port: 8081,
  title: "Login fix",
  branch: "task-1",
  worktree: "/Users/qa/task-1",
  slug: "shop",
  name: "Shop",
  compatibility: "fingerprint",
  keys: { ios: "fingerprint-abc" },
  startedAt: "t",
};

/** A server on `machineId` at `host`, as native reports what the registry announced. */
const found = (
  host: string,
  machineId: string,
  port = 8081,
  patch: Partial<RegisteredServer> = {},
): BonjourService => ({
  name: `preview-${machineId}-${port}`,
  host,
  port,
  txt: txtOf(
    { ...registered, port, ...patch },
    { id: machineId, name: `${machineId}-mac` },
    19150,
  ),
});

const groups = (services: BonjourService[], known: KnownMachine[] = []) =>
  bonjourRegistries({ services, appSlug: "shop", known });

test("reads back what the registry announced, all but the worktree", () => {
  expect(groups([found("192.168.1.30", "qa")])).toEqual([
    {
      host: "192.168.1.30",
      machine: "qa-mac",
      servers: [
        {
          id: "qa-8081",
          port: 8081,
          title: "Login fix",
          branch: "task-1",
          worktree: "",
          slug: "shop",
          name: "Shop",
          compatibility: "fingerprint",
          keys: { ios: "fingerprint-abc" },
          startedAt: "",
        },
      ],
    },
  ]);
});

test("another app's servers are left out", () => {
  expect(
    groups([found("192.168.1.30", "qa", 8081, { slug: "other" })]),
  ).toEqual([]);
});

test("two computers on the same port are two", () => {
  const both = groups([
    found("192.168.1.30", "qa"),
    found("192.168.1.31", "ci"),
  ]);
  expect(both.map((g) => [g.host, g.machine, g.servers[0].port])).toEqual([
    ["192.168.1.30", "qa-mac", 8081],
    ["192.168.1.31", "ci-mac", 8081],
  ]);
});

test("two servers on one computer are one group", () => {
  const one = groups([
    found("192.168.1.30", "qa", 8081),
    found("192.168.1.30", "qa", 8082),
  ]);
  expect(one.map((g) => g.servers.map((s) => s.port))).toEqual([[8081, 8082]]);
});

describe("a computer already reached another way is left to its registry", () => {
  const mine = found("192.168.1.10", "this-mac");

  test("this computer, by its registry's machine id", () => {
    expect(
      groups([mine], [{ host: "localhost", machineId: "this-mac" }]),
    ).toEqual([]);
  });

  test("this computer from the Android emulator, whose 10.0.2.2 is the Mac at its LAN address", () => {
    const registry = {
      host: "10.0.2.2",
      addresses: ["192.168.1.10", "10.0.0.5"],
    };
    expect(groups([mine], [registry])).toEqual([]);
  });

  test("a phone on Wi-Fi, whose Metro and scan are on the Mac's LAN address", () => {
    expect(groups([mine], [{ host: "192.168.1.10" }])).toEqual([]);
  });

  test("a host typed in, by machine id, so qa-mac.local and its address are one", () => {
    const typed = { host: "qa-mac.local", machineId: "qa" };
    expect(groups([found("192.168.1.30", "qa")], [typed])).toEqual([]);
  });

  test("another computer is kept", () => {
    const known = [
      { host: "localhost", machineId: "this-mac", addresses: ["192.168.1.10"] },
    ];
    expect(groups([found("192.168.1.30", "qa")], known)).toHaveLength(1);
  });
});
