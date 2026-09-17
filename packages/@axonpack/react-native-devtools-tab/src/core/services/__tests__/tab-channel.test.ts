import { expect, test } from "bun:test";

import {
  createMessageChannel,
  type Envelope,
} from "../message-channel.service";
import { createTabChannel } from "../tab-channel.service";

/** One channel, two tabs on it, which is the whole reason the binding exists. */
function two() {
  const posted: Envelope[] = [];
  let deliver: (value: unknown) => void = () => undefined;

  const channel = createMessageChannel({
    post: (envelope) => posted.push(envelope),
    subscribe: (next) => {
      deliver = next;
    },
  });

  return {
    posted,
    deliver: (envelope: Envelope) => deliver(envelope),
    left: createTabChannel(channel, "left"),
    right: createTabChannel(channel, "right"),
  };
}

test("a send names its own tab, without the caller saying so", () => {
  const { posted, left, right } = two();

  left.send("tab:mutate", { ops: [] });
  right.send("tab:hello");

  expect(posted).toEqual([
    { type: "tab:mutate", data: { ops: [], id: "left" } },
    { type: "tab:hello", data: { id: "right" } },
  ]);
});

test("a tab hears its own messages and not the other's", () => {
  const { deliver, left, right } = two();
  const heard: string[] = [];

  left.onMessage("tab:action", () => heard.push("left"));
  right.onMessage("tab:action", () => heard.push("right"));

  deliver({ type: "tab:action", data: { id: "right", action: "1:onClick" } });
  deliver({ type: "tab:action", data: { id: "left", action: "2:onClick" } });
  // No addressee, so nobody. A tab only ever answers for itself.
  deliver({ type: "tab:action", data: { action: "3:onClick" } });

  expect(heard).toEqual(["right", "left"]);
});
