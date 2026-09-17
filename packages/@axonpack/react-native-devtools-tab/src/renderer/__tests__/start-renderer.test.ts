import fs from "node:fs";
import path from "node:path";

import { createElement, useState } from "react";
import { expect, test } from "bun:test";
import { JSDOM, VirtualConsole } from "jsdom";

import { createRemoteSender } from "../../device/services/remote-sender.service";
import { TabFrame } from "../../device/components/tab-frame.component";

/**
 * Loads the built page the way a tab does, and drives it the way the app does.
 *
 * Every way this page can fail looks identical from outside: a blank tab, with the error going to
 * the iframe's own console. Running it here turns that into a failing test.
 */
const dist = path.resolve(import.meta.dir, "../../../dist/renderer");
const settle = () => new Promise((resolve) => setTimeout(resolve, 40));

function load(tab = "session") {
  const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
  const errors: string[] = [];

  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error: Error) => errors.push(String(error)));
  virtualConsole.on("error", (...args: unknown[]) =>
    errors.push(args.join(" ")),
  );

  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: `http://localhost/panel/index.html?tab=${tab}`,
    virtualConsole,
  });

  const sent: { type: string; data: unknown }[] = [];
  Object.defineProperty(dom.window, "parent", {
    value: { postMessage: (value: unknown) => sent.push(value as never) },
  });
  // The page builds elements, so it needs the document its own container belongs to.
  (globalThis as Record<string, unknown>).document = dom.window.document;

  const script = html.match(/src="\.\/(static\/js\/[^"]+\.js)"/)?.[1];
  dom.window.eval(fs.readFileSync(path.join(dist, script!), "utf8"));

  const register = (id = tab) =>
    dom.window.postMessage(
      { type: "tab:register", data: { id, name: "Session" } },
      "*",
    );

  // The app's half, with the debugger connection replaced by a direct hand-off. One per restart: a
  // sender holds the tree it drew, so an app starting over is a new one.
  const senderFor = (id = tab) =>
    createRemoteSender((ops) =>
      dom.window.postMessage({ type: "tab:mutate", data: { id, ops } }, "*"),
    );

  return { dom, sent, errors, sender: senderFor(), senderFor, register };
}

test("asks to be described, then draws what the app rendered", async () => {
  const { dom, sent, errors, sender, register } = load();

  // Named, so the app answers this tab alone rather than every tab it has.
  expect(sent).toEqual([{ type: "tab:hello", data: { id: "session" } }]);

  register();
  sender.render(createElement("p", null, "hello"));
  await settle();

  expect(errors).toEqual([]);
  expect(dom.window.document.body.textContent).toContain("hello");
});

test("a press reaches the app, and what it renders next comes back", async () => {
  const { dom, sent, sender, register } = load();

  function Panel() {
    const [count, setCount] = useState(0);
    return createElement(
      "button",
      { onClick: () => setCount(count + 1) },
      `count ${count}`,
    );
  }

  register();
  sender.render(createElement(Panel));
  await settle();

  const button = dom.window.document.querySelector("button")!;
  button.dispatchEvent(new dom.window.Event("click"));

  const action = sent.filter((m) => m.type === "tab:action").at(-1)!;
  const {
    id,
    action: handler,
    payload,
  } = action.data as {
    id: string;
    action: string;
    payload: unknown;
  };
  expect(id).toBe("session");

  sender.dispatch(handler, payload);
  await settle();

  expect(dom.window.document.body.textContent).toContain("count 1");
  // The same element, because changes are applied rather than the tree replaced.
  expect(dom.window.document.querySelector("button")).toBe(button);
});

test("ignores messages addressed to another tab", async () => {
  const { dom, senderFor } = load();

  senderFor("other").render(createElement("p", null, "wrong tab"));
  await settle();

  expect(dom.window.document.body.textContent).not.toContain("wrong tab");
});

test("asks again when the app restarts, so a drawn tab is redrawn", async () => {
  const { dom, sent, sender, register, senderFor } = load();

  sender.render(createElement("p", null, "before"));
  await settle();
  expect(dom.window.document.body.textContent).toContain("before");

  // The app starting over: a registration arrives out of nowhere and the sender that drew what is on
  // screen is gone with the engine it ran in. Nothing will be sent unless this page asks for it.
  const asked = sent.filter((m) => m.type === "tab:hello").length;
  register();
  await settle();
  expect(sent.filter((m) => m.type === "tab:hello").length).toBe(asked + 1);

  senderFor().render(createElement("p", null, "after"));
  await settle();

  expect(dom.window.document.body.textContent).toContain("after");
  expect(dom.window.document.body.textContent).not.toContain("before");
});

test("the refresh button holds a loader up, then draws the tab again", async () => {
  const { dom, sent, sender } = load();

  // The bar asks GitHub for a star count on mount. Nothing here is about that, and a test should not
  // be on the network.
  globalThis.fetch = (() =>
    Promise.reject(new Error("offline"))) as unknown as typeof fetch;

  sender.render(
    createElement(TabFrame, {
      name: "Session",
      component: () => createElement("p", null, "tab body"),
    }),
  );
  await settle();

  dom.window.document
    .querySelector("button")!
    .dispatchEvent(new dom.window.Event("click"));

  const press = sent.filter((m) => m.type === "tab:action").at(-1)!;
  const { action, payload } = press.data as {
    action: string;
    payload: unknown;
  };
  sender.dispatch(action, payload);
  await settle();

  // The point of the delay: a transition that awaits stays pending, so this is still up a frame
  // later rather than gone before anybody saw it.
  expect(dom.window.document.body.textContent).toContain("Rendering");
  expect(dom.window.document.body.textContent).not.toContain("tab body");

  for (let waited = 0; waited < 50; waited++) {
    if (dom.window.document.body.textContent?.includes("tab body")) break;
    await settle();
  }

  expect(dom.window.document.body.textContent).toContain("tab body");
  expect(dom.window.document.body.textContent).not.toContain("Rendering");
});
