import { expect, test } from "bun:test";

import {
  createMessageChannel,
  type Envelope,
} from "../message-channel.service";
import { createRemote, expose } from "../remote.service";

/** Two channels wired to each other, the way the app and the panel are. */
function pair() {
  const toB: ((value: unknown) => void)[] = [];
  const toA: ((value: unknown) => void)[] = [];

  const a = createMessageChannel({
    post: (envelope: Envelope) => toB.forEach((deliver) => deliver(envelope)),
    subscribe: (deliver) => toA.push(deliver),
  });
  const b = createMessageChannel({
    post: (envelope: Envelope) => toA.forEach((deliver) => deliver(envelope)),
    subscribe: (deliver) => toB.push(deliver),
  });

  return { a, b };
}

test("carries a message each way", () => {
  const { a, b } = pair();
  const seen: unknown[] = [];
  b.onMessage("tick", (payload) => seen.push(payload));

  a.send("tick", 1);

  expect(seen).toEqual([1]);
});

test("keeps what was sent before a transport existed, then flushes it", () => {
  const channel = createMessageChannel();
  channel.send("early", "held");

  const posted: Envelope[] = [];
  channel.attach({
    post: (envelope) => posted.push(envelope),
    subscribe: () => undefined,
  });

  expect(posted).toEqual([{ type: "early", data: "held" }]);
});

test("answers a request with the handler result", async () => {
  const { a, b } = pair();
  b.handle("double", (params) => (params as number) * 2);

  expect(await a.request<number>("double", 21)).toBe(42);
});

test("rejects rather than hanging when the far end throws", async () => {
  const { a, b } = pair();
  b.handle("boom", () => {
    throw new Error("no");
  });

  expect(a.request("boom")).rejects.toThrow("no");
});

test("rejects rather than hanging when nothing handles the method", async () => {
  const { a } = pair();

  expect(a.request("missing")).rejects.toThrow("No handler");
});

test("calls the other end as if its functions were local", async () => {
  const { a, b } = pair();
  expose(b, {
    greet: (name: string) => `hello ${name}`,
    slow: async () => "eventually",
  });

  const remote = createRemote<{
    greet: (name: string) => string;
    slow: () => Promise<string>;
  }>(a);

  expect(await remote.greet("ada")).toBe("hello ada");
  expect(await remote.slow()).toBe("eventually");
});

test("a call nobody answers rejects instead of hanging", async () => {
  // A far end that takes the message and never replies, which is what a device looks like while it
  // is reloading. Without the timeout the promise, and its entry in the pending map, live forever.
  const silent = createMessageChannel({
    post: () => undefined,
    subscribe: () => undefined,
  });

  expect(
    silent.request("nowhere", undefined, { timeoutMs: 10 }),
  ).rejects.toThrow("did not answer");
});

test("withdrawing exposed methods stops answering them", async () => {
  const { a, b } = pair();
  const withdraw = expose(b, { ping: () => "pong" });
  withdraw();

  expect(a.request("ping")).rejects.toThrow("No handler");
});
