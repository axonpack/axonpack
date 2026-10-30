import type { Socket } from "node:dgram";
import { EventEmitter } from "node:events";

import type { RegisteredServer } from "../../../constants/dev-preview-servers/dev-preview-servers.const";
import { readAnswers } from "../../../utils/registry/__tests__/read-answers.test-helper";
import { advertise, thisMachine } from "../bonjour.service";

const machine = {
  id: "abc",
  name: "qa-mac",
  addresses: ["192.168.1.24", "10.0.0.5"],
};
const server = (port: number, title = "Login fix"): RegisteredServer => ({
  id: `${port}-x`,
  port,
  title,
  branch: "task-1",
  worktree: "/w",
  slug: "shop",
  name: "Shop",
  compatibility: "appVersion",
  keys: { ios: "version-1.0.0" },
  startedAt: "t",
});

/**
 * A socket that records what goes out and on which interface. Nothing touches the network. A send
 * on an interface in `failing` fails the way macOS fails one without local network access.
 */
function fakeSocket() {
  const socket = new EventEmitter() as EventEmitter & Record<string, unknown>;
  const sent: { via: string; ttl: number; port: number; a?: string }[] = [];
  const failing = new Set<string>();
  let closed = false;
  let via = "";
  Object.assign(socket, {
    bind: (_port: number, ready: () => void) => setImmediate(ready),
    setMulticastTTL: () => undefined,
    addMembership: () => undefined,
    setMulticastInterface: (address: string) => (via = address),
    send: (
      packet: Buffer,
      _port: number,
      _group: string,
      done: (error?: Error) => void,
    ) => {
      if (failing.has(via)) {
        setImmediate(() =>
          done(new Error("send EHOSTUNREACH 224.0.0.251:5353")),
        );
        return;
      }
      const answers = readAnswers(packet);
      sent.push({
        via,
        ttl: answers[0].ttl,
        port: (answers[1].data as { port: number }).port,
        a: answers.find((r) => r.type === 1)?.data as string | undefined,
      });
      setImmediate(done);
    },
    close: () => (closed = true),
  });
  return {
    socket: socket as unknown as Socket,
    sent,
    failing,
    closed: () => closed,
  };
}

/** A query for the service type. */
const query = Buffer.concat([
  Buffer.from([0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0]),
  ...["_axon-preview", "_tcp", "local"].map((l) =>
    Buffer.concat([Buffer.from([l.length]), Buffer.from(l)]),
  ),
  Buffer.from([0, 0, 12, 0, 1]),
]);

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ["setImmediate"] });
});
afterEach(() => {
  jest.useRealTimers();
});

const settle = async (ms = 0) => {
  await jest.advanceTimersByTimeAsync(ms);
  for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r));
};

test("a new server is announced on every interface, twice, with that interface's address", async () => {
  const { socket, sent } = fakeSocket();
  advertise(machine, 19150, socket).sync([server(8081)]);
  await settle();
  expect(sent).toEqual([
    { via: "192.168.1.24", ttl: 120, port: 8081, a: "192.168.1.24" },
    { via: "10.0.0.5", ttl: 120, port: 8081, a: "10.0.0.5" },
  ]);
  await settle(1000);
  expect(sent).toHaveLength(4);
});

test("a heartbeat with nothing new sends nothing", async () => {
  const { socket, sent } = fakeSocket();
  const bonjour = advertise(machine, 19150, socket);
  bonjour.sync([server(8081)]);
  await settle(1000);
  sent.length = 0;
  bonjour.sync([server(8081)]);
  await settle(1000);
  expect(sent).toEqual([]);
});

test("a server that stops gets a goodbye, and a changed one is announced again", async () => {
  const { socket, sent } = fakeSocket();
  const bonjour = advertise(machine, 19150, socket);
  bonjour.sync([server(8081), server(8082)]);
  await settle(1000);
  sent.length = 0;
  bonjour.sync([server(8082, "Signup")]);
  await settle();
  expect(sent.map((s) => [s.port, s.ttl])).toEqual([
    [8081, 0],
    [8082, 0],
    [8081, 0],
    [8082, 0],
    [8082, 120],
    [8082, 120],
  ]);
  expect(sent.filter((s) => s.ttl === 0).every((s) => !s.a)).toBe(true);
});

test("answers a query for preview's servers, and ignores the rest", async () => {
  const { socket, sent } = fakeSocket();
  const bonjour = advertise(machine, 19150, socket);
  bonjour.sync([server(8081)]);
  await settle(1000);
  sent.length = 0;
  const other = Buffer.from(query);
  other.write("_expo", 13);
  socket.emit("message", other);
  await settle(200);
  expect(sent).toEqual([]);
  socket.emit("message", query);
  socket.emit("message", query);
  await settle(200);
  expect(sent.map((s) => [s.via, s.ttl])).toEqual([
    ["192.168.1.24", 120],
    ["10.0.0.5", 120],
  ]);
});

test("a failed bind turns it off and says why, and a failed send does not turn it off", async () => {
  const off = fakeSocket();
  const failed = advertise(machine, 19150, off.socket);
  off.socket.emit("error", new Error("bind EADDRINUSE 0.0.0.0:5353"));
  failed.sync([server(8081)]);
  await settle(1000);
  expect(off.sent).toEqual([]);
  expect(failed.error()).toBe("bind EADDRINUSE 0.0.0.0:5353");

  const on = fakeSocket();
  const working = advertise(machine, 19150, on.socket);
  await settle();
  on.socket.emit("error", new Error("EHOSTUNREACH"));
  working.sync([server(8081)]);
  await settle();
  expect(on.sent).toHaveLength(2);
});

test("says why when no send gets through, and stops once one does", async () => {
  const { socket, failing } = fakeSocket();
  const bonjour = advertise(machine, 19150, socket);
  failing.add("192.168.1.24").add("10.0.0.5");
  bonjour.sync([server(8081)]);
  await settle();
  expect(bonjour.error()).toBe("send EHOSTUNREACH 224.0.0.251:5353");
  // One interface failing, such as a VPN, is normal.
  failing.delete("192.168.1.24");
  await settle(1000);
  expect(bonjour.error()).toBeUndefined();
});

test("a stop says goodbye for each announced server, then closes the socket", async () => {
  const fake = fakeSocket();
  const bonjour = advertise(machine, 19150, fake.socket);
  bonjour.sync([server(8081), server(8082)]);
  await settle(1000);
  fake.sent.length = 0;
  await bonjour.stop();
  expect(fake.sent.map((s) => [s.via, s.port, s.ttl])).toEqual([
    ["192.168.1.24", 8081, 0],
    ["192.168.1.24", 8082, 0],
    ["10.0.0.5", 8081, 0],
    ["10.0.0.5", 8082, 0],
  ]);
  expect(fake.closed()).toBe(true);
});

test("this computer's id is the same on every call", () => {
  expect(thisMachine().id).toMatch(/^[0-9a-f]{12}$/);
  expect(thisMachine().id).toBe(thisMachine().id);
});
