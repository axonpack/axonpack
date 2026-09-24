import { expect, test } from "bun:test";
import { JSDOM } from "jsdom";

import type { RemoteOp } from "../../../core/constants/remote-op.const";

/**
 * The panel's own half: a tree of ops in, real elements out.
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

for (const name of [
  "ShadowRoot",
  "Node",
  "Element",
  "HTMLElement",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
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

const { createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { createRemoteReceiver } =
  await import("../../services/remote-receiver.service");
const { RemoteTree } = await import("../remote-tree.component");

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

function draw() {
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);

  const sent: { handler: string; payload: unknown }[] = [];
  const receiver = createRemoteReceiver();

  createRoot(container).render(
    createElement(RemoteTree, {
      receiver,
      send: (handler: string, payload: unknown) =>
        sent.push({ handler, payload }),
    }),
  );

  return {
    container,
    sent,
    apply: async (...ops: RemoteOp[]) => {
      receiver.apply(ops);
      await settle();
    },
  };
}

test("a tab written with div and button is still an ordinary DOM element", async () => {
  const { container, apply } = draw();

  await apply(
    { op: "create", id: 1, type: "p", props: { title: "wait" } },
    { op: "text", id: 2, text: "hello" },
    { op: "append", parent: 1, child: 2 },
    { op: "append", parent: 0, child: 1 },
  );

  const paragraph = container.querySelector("p")!;
  expect(paragraph.getAttribute("title")).toBe("wait");
  expect(paragraph.textContent).toBe("hello");
});

test("a prop React dropped comes off the element", async () => {
  const { container, apply } = draw();

  await apply(
    { op: "create", id: 1, type: "div", props: { title: "wait", id: "busy" } },
    { op: "append", parent: 0, child: 1 },
  );
  expect(container.querySelector("div")!.getAttribute("title")).toBe("wait");

  await apply({ op: "update", id: 1, props: { title: null, id: null } });

  const element = container.querySelector("div")!;
  expect(element.hasAttribute("title")).toBe(false);
  expect(element.hasAttribute("id")).toBe(false);
});

test("a keyboard handler is given the key it was pressed with", async () => {
  const { container, sent, apply } = draw();

  await apply(
    {
      op: "create",
      id: 1,
      type: "input",
      props: {
        readOnly: true,
        value: "ada",
        onKeyDown: { handler: "1:onKeyDown" },
      },
    },
    { op: "append", parent: 0, child: 1 },
  );

  const input = container.querySelector("input") as HTMLInputElement;
  input.dispatchEvent(
    new dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
  );

  expect(sent).toEqual([
    {
      handler: "1:onKeyDown",
      // An argument list, because a callback is called with whatever it is called with.
      payload: [
        {
          type: "keydown",
          key: "Enter",
          target: { value: "ada", checked: false },
          currentTarget: { value: "ada", checked: false },
          // React Native's TextInput reads the text from here rather than from the target.
          nativeEvent: { text: "ada", eventCount: 1 },
        },
      ],
    },
  ]);
});

test("a React Native element is handed to react-native-web untouched", async () => {
  const { container, apply } = draw();

  await apply(
    {
      op: "create",
      id: 1,
      type: "RCTView",
      props: { style: { flexDirection: "row", padding: 6 } },
    },
    {
      op: "create",
      id: 2,
      type: "RCTText",
      props: { style: { fontSize: 11 } },
    },
    { op: "text", id: 3, text: "native" },
    { op: "append", parent: 2, child: 3 },
    { op: "append", parent: 1, child: 2 },
    { op: "append", parent: 0, child: 1 },
  );

  // The class is react-native-web's own view reset. Getting one means the component ran, rather
  // than this package having guessed at what `RCTView` should look like.
  const view = container.firstElementChild as HTMLElement;
  expect(view.className).toContain("css-view");
  expect(view.style.flexDirection).toBe("row");
  expect(view.style.paddingTop).toBe("6px");

  const text = view.firstElementChild as HTMLElement;
  expect(text.className).toContain("css-text");
  expect(text.textContent).toBe("native");
});

test("a host name nobody mapped is still laid out rather than dropped", async () => {
  const { container, apply } = draw();

  // Text goes inside a text element, because that is React Native's own rule and react-native-web
  // keeps it: a raw string under a view is an error there as much as it is on a device.
  await apply(
    { op: "create", id: 1, type: "RCTSomethingNew", props: {} },
    { op: "create", id: 2, type: "RCTText", props: {} },
    { op: "text", id: 3, text: "there" },
    { op: "append", parent: 2, child: 3 },
    { op: "append", parent: 1, child: 2 },
    { op: "append", parent: 0, child: 1 },
  );

  expect((container.firstElementChild as HTMLElement).className).toContain(
    "css-view",
  );
  expect(container.textContent).toBe("there");
});

test("React Native's responder props are not handed to react-native-web", async () => {
  const { container, sent, apply } = draw();

  await apply(
    {
      op: "create",
      id: 1,
      type: "RCTView",
      props: {
        onClick: { handler: "1:onClick" },
        onStartShouldSetResponder: { handler: "1:onStartShouldSetResponder" },
        onResponderRelease: { handler: "1:onResponderRelease" },
      },
    },
    { op: "append", parent: 0, child: 1 },
  );

  // react-native-web has its own responder system under the same prop names. Given these it opens a
  // press it can never finish, because the answer would have to come back from a device.
  const view = container.firstElementChild as HTMLElement;
  expect(view.className).not.toContain("touchAction");

  view.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  expect(sent.map((message) => message.handler)).toEqual(["1:onClick"]);
});

test("typing reaches React Native's own TextInput, which reads nativeEvent", async () => {
  const { container, sent, apply } = draw();

  // What `<TextInput onChangeText={…}/>` compiles to: the host element gets `onChange`, and React
  // Native's own component is what turns that into `onChangeText`, by reading `nativeEvent.text`.
  await apply(
    {
      op: "create",
      id: 1,
      type: "RCTSinglelineTextInputView",
      props: { value: "", onChange: { handler: "1:onChange" } },
    },
    { op: "append", parent: 0, child: 1 },
  );

  const input = container.querySelector("input") as HTMLInputElement;

  // Through the prototype's setter, because React tracks the value it last wrote and ignores an
  // `input` event whose value it believes it already has.
  Object.getOwnPropertyDescriptor(
    dom.window.HTMLInputElement.prototype,
    "value",
  )!.set!.call(input, "ada");
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));

  const change = sent.at(-1);
  expect(change?.handler).toBe("1:onChange");
  expect(change?.payload).toMatchObject([
    { target: { value: "ada" }, nativeEvent: { text: "ada" } },
  ]);
});

test("a callback given a plain value is given that value, not an event", async () => {
  const { container, sent, apply } = draw();

  // React Native's `TextInput` does not keep `onChangeText` to itself: it falls through to the host
  // element, so the panel calls it, and react-native-web calls it the way React Native would, with
  // the text. Describing that as an event handed the app `[object Object]` to store.
  await apply(
    {
      op: "create",
      id: 1,
      type: "RCTSinglelineTextInputView",
      props: { value: "", onChangeText: { handler: "1:onChangeText" } },
    },
    { op: "append", parent: 0, child: 1 },
  );

  const input = container.querySelector("input") as HTMLInputElement;
  Object.getOwnPropertyDescriptor(
    dom.window.HTMLInputElement.prototype,
    "value",
  )!.set!.call(input, "ada");
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));

  const change = sent.find((message) => message.handler === "1:onChangeText");
  expect(change?.payload).toEqual(["ada"]);
});

test("a right-click a tab handles does not open the browser's own menu", async () => {
  const { container, sent, apply } = draw();

  await apply(
    {
      op: "create",
      id: 1,
      type: "div",
      props: { onContextMenu: { handler: "1:onContextMenu" } },
    },
    { op: "create", id: 2, type: "span", props: {} },
    { op: "append", parent: 0, child: 1 },
    { op: "append", parent: 0, child: 2 },
  );

  const handled = new dom.window.MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
  });
  container.querySelector("div")!.dispatchEvent(handled);
  expect(handled.defaultPrevented).toBe(true);
  expect(sent.map((call) => call.handler)).toEqual(["1:onContextMenu"]);

  // Anywhere the tab did not ask for right-clicks keeps the browser's menu.
  const unhandled = new dom.window.MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
  });
  container.querySelector("span")!.dispatchEvent(unhandled);
  expect(unhandled.defaultPrevented).toBe(false);
});

test("an element with the copy attribute copies its text here, and still calls home", async () => {
  const { container, sent, apply } = draw();
  const copied: string[] = [];
  Object.defineProperty(dom.window.navigator, "clipboard", {
    configurable: true,
    value: { writeText: async (text: string) => void copied.push(text) },
  });

  await apply(
    {
      op: "create",
      id: 1,
      type: "button",
      props: {
        "data-devtools-copy": "curl https://x.dev",
        onClick: { handler: "1:onClick" },
      },
    },
    { op: "append", parent: 0, child: 1 },
  );

  (container.querySelector("button") as HTMLButtonElement).click();

  // The copy is this page's, so it happens here rather than in the app.
  expect(copied).toEqual(["curl https://x.dev"]);
  expect(sent.map((call) => call.handler)).toEqual(["1:onClick"]);
});
