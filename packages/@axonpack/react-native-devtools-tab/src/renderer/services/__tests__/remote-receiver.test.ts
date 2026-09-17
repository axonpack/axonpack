import { expect, test } from "bun:test";

import type { RemoteOp } from "../../../core/constants/remote-op.const";
import {
  createRemoteReceiver,
  type RemoteNode,
} from "../remote-receiver.service";

/**
 * Ops by hand, so these say what an op means rather than what React happens to emit.
 *
 * The tree only, with no document anywhere: this side stopped building elements when
 * react-native-web took that job over, and what it holds now is what the panel's React renders
 * from. `remote-tree.component` is where that rendering is tested.
 */
function receive() {
  const receiver = createRemoteReceiver();

  return { receiver, apply: (...ops: RemoteOp[]) => receiver.apply(ops) };
}

/** What is on screen, as a plain object a failed expectation can print in full. */

function shapeOf(node: RemoteNode): unknown {
  if (node.type === "#text") return node.text;
  return {
    type: node.type,
    props: node.props,
    children: node.children.map(shapeOf),
  };
}

test("a prop that stops being sent is dropped rather than carried as null", () => {
  const { receiver, apply } = receive();

  apply(
    { op: "create", id: 1, type: "div", props: { title: "wait", id: "busy" } },
    { op: "append", parent: 0, child: 1 },
  );
  expect(receiver.root.children[0].props).toEqual({
    title: "wait",
    id: "busy",
  });

  // What the sender emits once React drops both props. Carrying the null on would hand React a
  // `title={null}`, which is a prop that is still there.
  apply({ op: "update", id: 1, props: { title: null, id: null } });

  expect(receiver.root.children[0].props).toEqual({});
});

test("an update keeps the props it says nothing about", () => {
  const { receiver, apply } = receive();

  apply(
    { op: "create", id: 1, type: "input", props: { value: "ada", id: "who" } },
    { op: "append", parent: 0, child: 1 },
    { op: "update", id: 1, props: { value: "grace" } },
  );

  expect(receiver.root.children[0].props).toEqual({
    value: "grace",
    id: "who",
  });
});

test("clear empties the screen but keeps the ids", () => {
  const { receiver, apply } = receive();

  // The order React itself uses on a first commit: it creates the nodes, then clears the container,
  // then appends. Dropping the ids on clear would throw away the tree being built.
  apply(
    { op: "create", id: 1, type: "p", props: {} },
    { op: "text", id: 2, text: "still here" },
    { op: "clear" },
    { op: "append", parent: 0, child: 1 },
    { op: "append", parent: 1, child: 2 },
  );

  expect(shapeOf(receiver.root)).toEqual({
    type: "#root",
    props: {},
    children: [{ type: "p", props: {}, children: ["still here"] }],
  });
});

test("a node is put where it was asked for, and taken out with its subtree", () => {
  const { receiver, apply } = receive();

  apply(
    { op: "create", id: 1, type: "p", props: {} },
    { op: "create", id: 2, type: "p", props: {} },
    { op: "create", id: 3, type: "span", props: {} },
    { op: "append", parent: 0, child: 1 },
    { op: "append", parent: 0, child: 2 },
    { op: "append", parent: 2, child: 3 },
  );

  apply({ op: "insert", parent: 0, child: 2, before: 1 });
  expect(receiver.root.children.map((node) => node.id)).toEqual([2, 1]);

  apply({ op: "remove", parent: 0, child: 2 });
  expect(receiver.root.children.map((node) => node.id)).toEqual([1]);

  // The subtree's ids went with it, so a stale op cannot reach a node that is off screen.
  apply({ op: "append", parent: 0, child: 3 });
  expect(receiver.root.children.map((node) => node.id)).toEqual([1]);
});

test("every applied batch is one version, which is what the panel re-renders on", () => {
  const { receiver, apply } = receive();

  let told = 0;
  const stop = receiver.subscribe(() => told++);

  const before = receiver.version();
  apply({ op: "text", id: 1, text: "a" });
  apply({ op: "retext", id: 1, text: "b" });

  expect(receiver.version()).toBe(before + 2);
  expect(told).toBe(2);

  stop();
  apply({ op: "retext", id: 1, text: "c" });
  expect(told).toBe(2);
});
