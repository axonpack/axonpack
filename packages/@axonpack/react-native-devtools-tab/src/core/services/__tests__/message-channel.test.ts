import { expect, test } from "bun:test";

import {
  createMessageChannel,
  type Envelope,
} from "../message-channel.service";

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
