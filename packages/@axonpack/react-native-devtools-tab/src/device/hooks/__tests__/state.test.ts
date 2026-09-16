import { createElement } from "react";

import { expect, test } from "bun:test";
import { JSDOM } from "jsdom";

import { ReactNativeDevtoolsPanel } from "../../../index";
import { createRemoteRoot } from "../../../panel/services/apply-remote-ops.service";
import { createRemoteTree } from "../../services/remote-renderer.service";
import { createState } from "../state.hook";

/** A tab's component, rendered for real, over a value the app also holds. */
function mount() {
  const dom = new JSDOM("<div id='root'></div>");
  const container = dom.window.document.getElementById("root") as HTMLElement;
  (globalThis as Record<string, unknown>).document = dom.window.document;

  const pressed: { handler: string; payload: unknown }[] = [];
  const root = createRemoteRoot(container, (handler, payload) =>
    pressed.push({ handler, payload }),
  );
  const tree = createRemoteTree((ops) => root.apply(ops));

  return {
    container,
    tree,
    press(label: string) {
      const button = [...container.querySelectorAll("button")].find(
        (element) => element.textContent === label,
      )!;
      button.dispatchEvent(new dom.window.Event("click"));
      const last = pressed.at(-1)!;
      tree.dispatch(last.handler, last.payload);
    },
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

test("the app sets it and the tab redraws", async () => {
  const { container, tree } = mount();
  const session = createState({ user: "nobody" });

  function Panel() {
    const { user } = session.use();
    return createElement("p", null, `user ${user}`);
  }

  tree.render(createElement(Panel));
  await settle();
  expect(container.textContent).toContain("user nobody");

  session.set({ user: "ada" });
  await settle();
  expect(container.textContent).toContain("user ada");
});

test("the tab sets it and the app sees it", async () => {
  const { tree, press } = mount();
  const session = createState({ requests: 0 });

  function Panel() {
    // Subscribed as well as pressed, so the redraw after the press is part of what this checks.
    session.use();
    return createElement(
      "button",
      {
        onClick: () =>
          session.set((current) => ({ requests: current.requests + 1 })),
      },
      "count",
    );
  }

  tree.render(createElement(Panel));
  await settle();

  press("count");
  await settle();
  expect(session.get().requests).toBe(1);
});

test("setting the same value again redraws nothing", async () => {
  const { tree } = mount();
  const session = createState("steady");
  let renders = 0;

  function Panel() {
    renders += 1;
    return createElement("p", null, session.use());
  }

  tree.render(createElement(Panel));
  await settle();
  const before = renders;

  session.set("steady");
  await settle();
  expect(renders).toBe(before);
});

test("a registered tab draws nothing until a panel asks for it", () => {
  let rendered = false;

  ReactNativeDevtoolsPanel.registerTab({
    id: "gated",
    name: "Gated",
    component: () => {
      rendered = true;
      return null;
    },
  });

  // No debugger connection in a release build, so no panel, so the component never runs and neither
  // do its effects. This is the whole of the production gate.
  expect(rendered).toBe(false);
});
