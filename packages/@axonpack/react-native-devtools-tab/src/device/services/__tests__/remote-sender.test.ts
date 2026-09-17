import { createElement, useState, useSyncExternalStore } from "react";

import { expect, test } from "bun:test";
import { JSDOM } from "jsdom";

import { createRemoteSender } from "../remote-sender.service";

/**
 * Both halves at once: React in one place, the panel's React in another, with the ops carried by
 * hand instead of by the debugger channel. That is the only part these tests leave out.
 *
 * The window is made before the panel's side is imported, because react-native-web looks for a
 * document as it loads and gives up on its stylesheet if there is not one yet.
 */
const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
});

// A browser has these on the global, and both react-dom and react-native-web reach for them by
// bare name. A real page and the built bundle have them; this file has to put them there itself.
for (const name of [
  "ShadowRoot",
  "Node",
  "Element",
  "HTMLElement",
  "Event",
  "MouseEvent",
  "CSSStyleSheet",
  "MutationObserver",
  "getComputedStyle",
  "requestAnimationFrame",
  "cancelAnimationFrame",
]) {
  (globalThis as Record<string, unknown>)[name] = (
    dom.window as unknown as Record<string, unknown>
  )[name];
}

const { createRoot } = await import("react-dom/client");
const { createRemoteReceiver } =
  await import("../../../renderer/services/remote-receiver.service");
const { RemoteTree } =
  await import("../../../renderer/components/remote-tree.component");
const { TabFrame } = await import("../../components/tab-frame.component");

function mount() {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);

  const pressed: { handler: string; payload: unknown }[] = [];
  const receiver = createRemoteReceiver();

  // Through JSON, because that is what the debugger connection carries. Handing objects straight
  // across made the tests kinder than the wire: identity survived here and never survives there.
  const wire = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

  createRoot(container).render(
    createElement(RemoteTree, {
      receiver,
      send: (handler: string, payload: unknown) =>
        pressed.push({ handler, payload: wire(payload) }),
    }),
  );

  const sender = createRemoteSender((ops) => receiver.apply(wire(ops)));

  return {
    container,
    receiver,
    sender,
    pressed,
    // Bubbling, because React listens at the root it was given rather than on each element.
    click: (element: Element) =>
      element.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true }),
      ),
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
  second.receiver.apply(sender.replay());
  await settle();

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

test("every tab gets the library's bar, and its button renders the tab again", async () => {
  const { container, sender, pressed, click } = mount();

  let renders = 0;
  function Body() {
    renders++;
    return createElement("p", null, "body");
  }

  sender.render(createElement(TabFrame, { name: "Session", component: Body }));
  await settle();

  expect(
    container.querySelector("header.axonpack-tab-bar")?.textContent,
  ).toContain("Session");
  expect(renders).toBe(1);

  click(container.querySelector("header button")!);
  sender.dispatch(pressed[0].handler, pressed[0].payload);
  await settle();

  // The bar holds a loader up for a moment first, so the tab is not drawn again on this tick.
  expect(renders).toBe(1);

  for (let waited = 0; waited < 50 && renders < 2; waited++) await settle();

  expect(renders).toBe(2);
});

test("a React Native tree is drawn by react-native-web, not translated", async () => {
  const { container, sender, pressed, click } = mount();

  let taps = 0;

  /**
   * What `<View style={styles.row}><Pressable onPress={…}><Text>Tap</Text></Pressable></View>`
   * compiles to. Written out rather than imported, because React Native's source is Flow and does
   * not run outside Metro; these are the host types and props it hands a renderer.
   */
  function Screen() {
    return createElement(
      "RCTView",
      { style: { flexDirection: "row", gap: 8, padding: 12 } },
      createElement(
        "RCTView",
        {
          style: [{ backgroundColor: "#2b3040" }, { borderRadius: 8 }],
          collapsable: false,
          onClick: () => taps++,
          onStartShouldSetResponder: () => true,
          onResponderRelease: () => {},
        },
        createElement("RCTText", { style: { fontSize: 12 } }, "Tap"),
      ),
    );
  }

  sender.render(createElement(Screen));
  await settle();

  // `css-view` is react-native-web's own reset, which is the whole point: Yoga's defaults are its
  // job rather than something this package writes out.
  const row = container.firstElementChild as HTMLElement;
  expect(row.className).toContain("css-view");
  expect(row.style.flexDirection).toBe("row");
  expect(row.style.paddingTop).toBe("12px");

  const button = row.firstElementChild as HTMLElement;
  expect(button.style.backgroundColor).toBe("rgb(43, 48, 64)");
  // Normalised to the four corners, the way react-native-web normalises it on the web.
  expect(button.style.borderTopLeftRadius).toBe("8px");
  // A view manager instruction, dropped because it is not a prop a DOM element has.
  expect(button.hasAttribute("collapsable")).toBe(false);

  const label = button.firstElementChild as HTMLElement;
  expect(label.className).toContain("css-text");
  expect(label.getAttribute("dir")).toBe("auto");
  expect(label.textContent).toBe("Tap");

  // The press React Native already puts on the view, arriving as the DOM event the panel sends.
  click(button);
  const press = pressed.at(-1)!;
  sender.dispatch(press.handler, press.payload);
  await settle();

  expect(taps).toBe(1);
});

test("clicking the label inside a pressable reaches the app's onPress", async () => {
  const { container, sender, pressed, click } = mount();

  let taps = 0;

  // What RN's Pressable actually produces: onClick plus the responder props, and the user clicks
  // the Text inside it rather than the view that carries the handler.
  function Screen() {
    return createElement(
      "RCTView",
      {
        style: { padding: 10 },
        onClick: () => taps++,
        onStartShouldSetResponder: () => true,
        onResponderGrant: () => {},
        onResponderRelease: () => {},
        onResponderTerminationRequest: () => true,
      },
      createElement("RCTText", null, "Increment"),
    );
  }

  sender.render(createElement(Screen));
  await settle();

  const label = container.querySelector(".css-text-146c3p1") as HTMLElement;
  expect(label.textContent).toBe("Increment");

  click(label);
  const press = pressed.at(-1);
  if (press) sender.dispatch(press.handler, press.payload);
  await settle();

  // The responder props are React Native's own protocol and cannot answer across a wire, so the
  // press rides on `onClick`, which Pressability sets at render time for exactly this reason.
  expect(taps).toBe(1);
});

test("a handler comparing target with currentTarget sees one object, not two", async () => {
  const { container, sender, pressed, click } = mount();

  let pressedWith: { same: boolean } | null = null;

  // What React Native's `Pressability` does first: a click whose target is not the element the
  // handler sits on belongs to something nested, so it is ignored. Across JSON the two arrive as
  // separate objects, which made that check reject every press a `Pressable` ever received.
  function Screen() {
    return createElement(
      "RCTView",
      {
        onClick: (event: { target: unknown; currentTarget: unknown }) => {
          pressedWith = { same: event.currentTarget === event.target };
        },
      },
      createElement("RCTText", null, "Increment"),
    );
  }

  sender.render(createElement(Screen));
  await settle();

  click(container.querySelector(".css-text-146c3p1") as HTMLElement);
  const press = pressed.at(-1)!;
  sender.dispatch(press.handler, press.payload);
  await settle();

  expect(pressedWith).toEqual({ same: true });
});
