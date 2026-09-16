import { expect, test } from "bun:test";
import { JSDOM } from "jsdom";

import { ref, type UiNode } from "../../core/constants/ui-node.const";
import { renderNode } from "../services/render-node.service";
import { resolveLayout, slicesOf } from "../services/resolve-layout.service";

const dom = new JSDOM("<body></body>");
globalThis.document = dom.window.document;

const draw = (
  node: UiNode,
  state: Record<string, unknown> = {},
  onAction: (action: string, payload?: unknown) => void = () => {},
) => renderNode(resolveLayout(node, state), onAction);

test("fills a layout from state", () => {
  const layout: UiNode = {
    kind: "stack",
    children: [
      { kind: "heading", value: ref("title") },
      { kind: "field", label: "user", value: ref("user.email") },
    ],
  };

  expect(
    draw(layout, { title: "Session", user: { email: "ada@x.test" } })
      .textContent,
  ).toBe("Sessionuserada@x.test");
});

test("renders a hole with no value as empty rather than throwing", () => {
  expect(
    draw({ kind: "text", value: ref("missing.deep.path") }).textContent,
  ).toBe("");
});

test("collects only the slices a layout actually reads", () => {
  const layout: UiNode = {
    kind: "stack",
    children: [
      { kind: "text", value: ref("user.email") },
      { kind: "table", columns: ["a"], rows: ref("rows") },
      { kind: "text", value: "a constant" },
    ],
  };

  // `user.email` counts as the `user` slice, because a slice is what the app updates in.
  expect([...slicesOf(layout)].sort()).toEqual(["rows", "user"]);
});

test("picks a branch with `when`", () => {
  const layout: UiNode = {
    kind: "when",
    value: ref("busy"),
    show: { kind: "text", value: "working" },
    otherwise: { kind: "text", value: "idle" },
  };

  expect(draw(layout, { busy: true }).textContent).toBe("working");
  expect(draw(layout, { busy: false }).textContent).toBe("idle");
});

test("lays a table out by its declared columns, not by each row", () => {
  const table = draw(
    { kind: "table", columns: ["a", "b"], rows: ref("rows") },
    {
      rows: [["1"], ["1", "2", "3"]],
    },
  );
  const rows = table.querySelectorAll("tbody tr");

  expect(rows[0]?.children).toHaveLength(2);
  expect(rows[0]?.children[1]?.textContent).toBe("");
  expect(rows[1]?.children).toHaveLength(2);
});

test("reports a pressed button", () => {
  const seen: unknown[] = [];
  const button = draw(
    { kind: "button", label: "Go", action: "go", payload: 7 },
    {},
    (...args) => seen.push(args),
  );

  button.dispatchEvent(new dom.window.Event("click"));

  expect(seen).toEqual([["go", 7]]);
});

test("renders text as text, never as markup", () => {
  // Everything drawn here came off the wire from the app. A URL or a log line containing markup has
  // to show as those characters.
  const node = draw(
    { kind: "text", value: ref("hostile") },
    { hostile: "<img src=x onerror=1>" },
  );

  expect(node.querySelector("img")).toBeNull();
  expect(node.textContent).toBe("<img src=x onerror=1>");
});
