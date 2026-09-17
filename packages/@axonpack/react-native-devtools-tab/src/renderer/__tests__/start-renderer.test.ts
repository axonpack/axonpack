import fs from "node:fs";
import path from "node:path";

import { createElement, useState } from "react";
import { expect, test } from "bun:test";
import { JSDOM, VirtualConsole } from "jsdom";

import { createRemoteSender } from "../../device/services/remote-sender.service";

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

  // The app's half, with the debugger connection replaced by a direct hand-off.
  const sender = createRemoteSender((ops) =>
    dom.window.postMessage({ type: "tab:mutate", data: { id: tab, ops } }, "*"),
  );

  return { dom, sent, errors, sender, register };
}

test("asks to be described, then draws what the app rendered", async () => {
  const { dom, sent, errors, sender, register } = load();

  expect(sent).toEqual([{ type: "tab:hello", data: undefined }]);

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
  const { dom, sender, register } = load();

  register("other");
  sender.render(createElement("p", null, "wrong tab"));
  await settle();

  // The registration was for another tab, so this page never made a root to draw into.
  expect(dom.window.document.body.textContent).not.toContain("wrong tab");
});
