import fs from "node:fs";
import path from "node:path";

import { expect, test } from "bun:test";
import { JSDOM, VirtualConsole } from "jsdom";

/**
 * Loads the built page the way a tab does, and drives it the way the app does.
 *
 * Every way this page can fail looks identical from outside: a blank tab, with the error going to
 * the iframe's own console. Running it here turns that into a failing test.
 */
const dist = path.resolve(import.meta.dir, "../../../dist/panel");

function load() {
  const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
  const errors: string[] = [];

  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error: Error) => errors.push(String(error)));
  virtualConsole.on("error", (...args: unknown[]) =>
    errors.push(args.join(" ")),
  );

  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "http://localhost/panel/index.html?tab=session",
    virtualConsole,
  });

  const sent: { type: string; data: unknown }[] = [];
  Object.defineProperty(dom.window, "parent", {
    value: { postMessage: (value: unknown) => sent.push(value as never) },
  });

  const script = html.match(/src="\.\/(static\/js\/[^"]+\.js)"/)?.[1];
  dom.window.eval(fs.readFileSync(path.join(dist, script!), "utf8"));

  return { dom, sent, errors };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

test("asks for its registration, then draws it", async () => {
  const { dom, sent, errors } = load();

  expect(sent).toEqual([{ type: "tab:hello", data: undefined }]);

  dom.window.postMessage(
    {
      type: "tab:register",
      data: {
        id: "session",
        name: "Session",
        layout: { kind: "field", label: "user", value: { $ref: "user" } },
        state: { user: "nobody" },
      },
    },
    "*",
  );
  await settle();

  expect(errors).toEqual([]);
  expect(dom.window.document.body.textContent).toContain("nobody");
});

test("redraws on a slice it reads, and ignores one it does not", async () => {
  const { dom } = load();

  dom.window.postMessage(
    {
      type: "tab:register",
      data: {
        id: "session",
        name: "Session",
        layout: { kind: "text", value: { $ref: "user" } },
        state: { user: "ada" },
      },
    },
    "*",
  );
  await settle();

  dom.window.postMessage(
    { type: "tab:state", data: { id: "session", state: { user: "bob" } } },
    "*",
  );
  await settle();
  expect(dom.window.document.body.textContent).toContain("bob");

  // `noise` is not in the layout, so the page keeps what it has rather than redrawing.
  dom.window.postMessage(
    {
      type: "tab:state",
      data: { id: "session", state: { noise: Date.now() } },
    },
    "*",
  );
  await settle();
  expect(dom.window.document.body.textContent).toContain("bob");
});

test("ignores messages addressed to another tab", async () => {
  const { dom } = load();

  dom.window.postMessage(
    {
      type: "tab:register",
      data: {
        id: "other",
        name: "Other",
        layout: { kind: "text", value: "wrong tab" },
        state: {},
      },
    },
    "*",
  );
  await settle();

  expect(dom.window.document.body.textContent).not.toContain("wrong tab");
});
