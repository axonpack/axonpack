import { expect, test } from "bun:test";
import { JSDOM } from "jsdom";

import type { RemoteOp } from "../../../core/constants/remote-op.const";
import { createRemoteReceiver } from "../remote-receiver.service";

/** Ops by hand, so these say what an op means rather than what React happens to emit. */
function receive() {
  const dom = new JSDOM("<div id='root'></div>");
  const container = dom.window.document.getElementById("root") as HTMLElement;
  (globalThis as Record<string, unknown>).document = dom.window.document;

  const sent: { handler: string; payload: unknown }[] = [];
  const receiver = createRemoteReceiver(container, (handler, payload) =>
    sent.push({ handler, payload }),
  );

  return {
    container,
    sent,
    window: dom.window,
    apply: (...ops: RemoteOp[]) => receiver.apply(ops),
  };
}

test("a prop that stops being sent is taken off the element", () => {
  const { container, apply } = receive();

  apply(
    { op: "create", id: 1, type: "div", props: { title: "wait", id: "busy" } },
    { op: "append", parent: 0, child: 1 },
  );
  expect(container.querySelector("div")!.getAttribute("title")).toBe("wait");

  // What the sender emits once React drops both props.
  apply({ op: "update", id: 1, props: { title: null, id: null } });

  const element = container.querySelector("div")!;
  expect(element.hasAttribute("title")).toBe(false);
  expect(element.hasAttribute("id")).toBe(false);
});

test("value and checked go back to empty rather than to the word null", () => {
  const { container, apply } = receive();

  apply(
    { op: "create", id: 1, type: "input", props: { value: "ada" } },
    { op: "append", parent: 0, child: 1 },
    { op: "create", id: 2, type: "input", props: { checked: true } },
    { op: "append", parent: 0, child: 2 },
  );

  apply(
    { op: "update", id: 1, props: { value: null } },
    { op: "update", id: 2, props: { checked: null } },
  );

  const [text, box] = [...container.querySelectorAll("input")];
  expect((text as HTMLInputElement).value).toBe("");
  expect((box as HTMLInputElement).checked).toBe(false);
});

test("clear empties the screen but keeps the ids", () => {
  const { container, apply } = receive();

  // The order React itself uses on a first commit: it creates the nodes, then clears the container,
  // then appends. Dropping the ids on clear would throw away the tree being built.
  apply(
    { op: "create", id: 1, type: "p", props: {} },
    { op: "text", id: 2, text: "still here" },
    { op: "clear" },
    { op: "append", parent: 0, child: 1 },
    { op: "append", parent: 1, child: 2 },
  );

  expect(container.textContent).toBe("still here");
});

test("a keyboard handler is given the key it was pressed with", () => {
  const { container, sent, window, apply } = receive();

  apply(
    {
      op: "create",
      id: 1,
      type: "input",
      props: { onKeyDown: { handler: "1:onKeyDown" } },
    },
    { op: "append", parent: 0, child: 1 },
  );

  const input = container.querySelector("input") as HTMLInputElement;
  input.value = "ada";
  input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter" }));

  expect(sent).toEqual([
    {
      handler: "1:onKeyDown",
      payload: {
        type: "keydown",
        key: "Enter",
        target: { value: "ada", checked: false },
        currentTarget: { value: "ada", checked: false },
      },
    },
  ]);
});
