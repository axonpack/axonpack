import { createElement, useState } from "react";

import { expect, test } from "bun:test";
import { JSDOM } from "jsdom";

import { createRemoteRoot } from "../../../panel/services/apply-remote-ops.service";
import { createRemoteTree } from "../remote-renderer.service";

/**
 * Both halves at once: React in one place, the DOM in another, with the ops carried by hand instead
 * of by the debugger channel. That is the only part these tests leave out.
 */
function mount() {
  const dom = new JSDOM("<div id='root'></div>");
  const container = dom.window.document.getElementById("root") as HTMLElement;
  // `createRemoteRoot` builds elements, so it needs the document the container belongs to.
  (globalThis as Record<string, unknown>).document = dom.window.document;

  const pressed: { handler: string; payload: unknown }[] = [];
  const root = createRemoteRoot(container, (handler, payload) =>
    pressed.push({ handler, payload }),
  );

  const tree = createRemoteTree((ops) => root.apply(ops));
  return {
    container,
    tree,
    pressed,
    click: (element: Element) =>
      element.dispatchEvent(new dom.window.Event("click")),
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

test("a component's hooks run in the app and its DOM appears in the panel", async () => {
  const { container, tree, pressed, click } = mount();

  function Panel() {
    const [count, setCount] = useState(0);
    return createElement(
      "div",
      { className: "wrap" },
      createElement("span", null, `count ${count}`),
      createElement("button", { onClick: () => setCount(count + 1) }, "more"),
    );
  }

  tree.render(createElement(Panel));
  await settle();

  expect(container.querySelector("div.wrap")).not.toBeNull();
  expect(container.textContent).toContain("count 0");

  const button = container.querySelector("button")!;
  click(button);
  expect(pressed).toHaveLength(1);

  // The panel cannot run the handler, so it sends back the name the prop was swapped for.
  tree.dispatch(pressed[0].handler, pressed[0].payload);
  await settle();
  expect(container.textContent).toContain("count 1");

  // The same button element, not a replacement: this is what keeps focus and the caret in an input
  // while something above it re-renders.
  expect(container.querySelector("button")).toBe(button);
});

test("a panel opening later is told the tree that is already there", async () => {
  const { tree } = mount();

  function Panel() {
    return createElement("p", null, "late");
  }

  tree.render(createElement(Panel));
  await settle();

  // A second panel, with none of the earlier changes.
  const second = mount();
  second.tree.render(null);
  const root = createRemoteRoot(second.container, () => undefined);
  root.apply(tree.replay());

  expect(second.container.textContent).toContain("late");
});

test("removing a node stops its handlers answering", async () => {
  const { container, tree, pressed, click } = mount();
  let calls = 0;

  function Panel() {
    const [shown, setShown] = useState(true);
    return createElement(
      "div",
      null,
      createElement("button", { onClick: () => setShown(false) }, "hide"),
      shown
        ? createElement("button", { onClick: () => (calls += 1) }, "count me")
        : null,
    );
  }

  tree.render(createElement(Panel));
  await settle();

  const counted = [...container.querySelectorAll("button")].find(
    (element) => element.textContent === "count me",
  )!;
  const handler = pressed.length;
  click(counted);
  tree.dispatch(pressed[handler].handler, null);
  expect(calls).toBe(1);

  click([...container.querySelectorAll("button")][0]);
  tree.dispatch(pressed[pressed.length - 1].handler, null);
  await settle();

  // Gone from the DOM, and the name it answered to no longer reaches anything.
  expect(container.textContent).not.toContain("count me");
  tree.dispatch(pressed[handler].handler, null);
  expect(calls).toBe(1);
});
