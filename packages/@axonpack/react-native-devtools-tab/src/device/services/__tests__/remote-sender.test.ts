import { createElement, useState, useSyncExternalStore } from "react";

import { expect, test } from "bun:test";
import { JSDOM } from "jsdom";

import { createRemoteReceiver } from "../../../renderer/services/remote-receiver.service";
import { createRemoteSender } from "../remote-sender.service";

/**
 * Both halves at once: React in one place, the DOM in another, with the ops carried by hand instead
 * of by the debugger channel. That is the only part these tests leave out.
 */
function mount() {
  const dom = new JSDOM("<div id='root'></div>");
  const container = dom.window.document.getElementById("root") as HTMLElement;
  // `createRemoteReceiver` builds elements, so it needs the document the container belongs to.
  (globalThis as Record<string, unknown>).document = dom.window.document;

  const pressed: { handler: string; payload: unknown }[] = [];
  const receiver = createRemoteReceiver(container, (handler, payload) =>
    pressed.push({ handler, payload }),
  );

  const sender = createRemoteSender((ops) => receiver.apply(ops));
  return {
    container,
    sender,
    pressed,
    click: (element: Element) =>
      element.dispatchEvent(new dom.window.Event("click")),
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

test("a component's hooks run in the app and its DOM appears in the panel", async () => {
  const { container, sender, pressed, click } = mount();

  function Panel() {
    const [count, setCount] = useState(0);
    return createElement(
      "div",
      { className: "wrap" },
      createElement("span", null, `count ${count}`),
      createElement("button", { onClick: () => setCount(count + 1) }, "more"),
    );
  }

  sender.render(createElement(Panel));
  await settle();

  expect(container.querySelector("div.wrap")).not.toBeNull();
  expect(container.textContent).toContain("count 0");

  const button = container.querySelector("button")!;
  click(button);
  expect(pressed).toHaveLength(1);

  // The panel cannot run the handler, so it sends back the name the prop was swapped for.
  sender.dispatch(pressed[0].handler, pressed[0].payload);
  await settle();
  expect(container.textContent).toContain("count 1");

  // The same button element, not a replacement: this is what keeps focus and the caret in an input
  // while something above it re-renders.
  expect(container.querySelector("button")).toBe(button);
});

test("a panel opening later is told the tree that is already there", async () => {
  const { sender } = mount();

  function Panel() {
    return createElement("p", null, "late");
  }

  sender.render(createElement(Panel));
  await settle();

  // A second panel, with none of the earlier changes.
  const second = mount();
  second.sender.render(null);
  const receiver = createRemoteReceiver(second.container, () => undefined);
  receiver.apply(sender.replay());

  expect(second.container.textContent).toContain("late");
});

test("removing a node stops its handlers answering", async () => {
  const { container, sender, pressed, click } = mount();
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

  sender.render(createElement(Panel));
  await settle();

  const counted = [...container.querySelectorAll("button")].find(
    (element) => element.textContent === "count me",
  )!;
  const handler = pressed.length;
  click(counted);
  sender.dispatch(pressed[handler].handler, null);
  expect(calls).toBe(1);

  click([...container.querySelectorAll("button")][0]);
  sender.dispatch(pressed[pressed.length - 1].handler, null);
  await settle();

  // Gone from the DOM, and the name it answered to no longer reaches anything.
  expect(container.textContent).not.toContain("count me");
  sender.dispatch(pressed[handler].handler, null);
  expect(calls).toBe(1);
});

test("a tab follows the app's own store, and writes back to it", async () => {
  const { container, sender, pressed, click } = mount();

  // The app's state, as any state library would hold it.
  let state = { requests: 0 };
  const listeners = new Set<() => void>();
  const store = {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot: () => state,
    bump: () => {
      state = { requests: state.requests + 1 };
      for (const listener of listeners) listener();
    },
  };

  function Panel() {
    const session = useSyncExternalStore(store.subscribe, store.snapshot);
    return createElement(
      "button",
      { onClick: store.bump },
      `requests ${session.requests}`,
    );
  }

  sender.render(createElement(Panel));
  await settle();
  expect(container.textContent).toContain("requests 0");

  // The app changes it. No message is sent: the tab is subscribed to the same object.
  store.bump();
  await settle();
  expect(container.textContent).toContain("requests 1");

  // The tab changes it, and the app sees it, because the handler runs on the app's side.
  click(container.querySelector("button")!);
  sender.dispatch(pressed.at(-1)!.handler, pressed.at(-1)!.payload);
  await settle();
  expect(store.snapshot().requests).toBe(2);
  expect(container.textContent).toContain("requests 2");
});

test("a prop React stops rendering is taken off the element", async () => {
  const { container, sender, pressed, click } = mount();

  function Panel() {
    const [busy, setBusy] = useState(true);
    return createElement("button", {
      onClick: () => setBusy(false),
      title: busy ? "working" : undefined,
    });
  }

  sender.render(createElement(Panel));
  await settle();
  expect(container.querySelector("button")!.getAttribute("title")).toBe(
    "working",
  );

  click(container.querySelector("button")!);
  sender.dispatch(pressed.at(-1)!.handler, pressed.at(-1)!.payload);
  await settle();

  // React sends only what changed, so a prop that went has to be named as gone rather than left out.
  expect(container.querySelector("button")!.hasAttribute("title")).toBe(false);
});
