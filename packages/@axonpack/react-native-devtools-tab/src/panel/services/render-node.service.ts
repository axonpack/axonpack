import type { Bound, UiNode, UiTone } from "../../core/constants/ui-node.const";

/**
 * Draws a layout into the DOM.
 *
 * It only ever sees a layout `resolveLayout` has already been over, so every bound field holds a
 * plain value by the time it arrives here. `plain` is where that assumption is stated once, instead
 * of a cast at each use.
 *
 * Plain DOM on purpose. The vocabulary is a dozen shapes, and a renderer for it is smaller than the
 * framework needed to render it.
 */

/** Resolved against the stylesheet rather than to a colour, so a theme change is one place. */
const TONES: Record<UiTone, string> = {
  default: "var(--fg)",
  muted: "var(--muted)",
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--error)",
};

export type ActionHandler = (action: string, payload?: unknown) => void;

function plain<T>(value: Bound<T> | undefined): T | undefined {
  return value as T | undefined;
}

function text(value: Bound<string> | undefined): string {
  return String(plain(value) ?? "");
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  content?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  // `textContent`, never `innerHTML`: everything here came off the wire from the app, and a log line
  // or a URL containing markup must render as that text rather than as markup.
  if (content !== undefined) node.textContent = content;
  return node;
}

function tone(node: HTMLElement, value: UiTone | undefined): HTMLElement {
  if (value && value !== "default") node.style.color = TONES[value];
  return node;
}

export function renderNode(node: UiNode, onAction: ActionHandler): HTMLElement {
  switch (node.kind) {
    case "text":
      return tone(element("div", "text", text(node.value)), node.tone);

    case "heading":
      return element("div", "heading", text(node.value));

    case "badge":
      return tone(element("span", "badge", text(node.value)), node.tone);

    case "divider":
      return element("div", "divider");

    case "row":
    case "stack": {
      const box = element("div", node.kind);
      for (const child of node.children)
        box.appendChild(renderNode(child, onAction));
      return box;
    }

    case "field": {
      const box = element("div", "field");
      box.appendChild(element("span", "label", node.label));
      box.appendChild(
        tone(element("span", "value", text(node.value)), node.tone),
      );
      return box;
    }

    case "json": {
      const box = element("pre", "json");
      const value = plain(node.value);
      box.textContent = JSON.stringify(value, null, 2) ?? String(value);
      return box;
    }

    case "table": {
      const table = element("table", "table");
      const head = table
        .appendChild(element("thead"))
        .appendChild(element("tr"));
      for (const column of node.columns)
        head.appendChild(element("th", undefined, column));

      const body = table.appendChild(element("tbody"));
      for (const row of plain(node.rows) ?? []) {
        const line = body.appendChild(element("tr"));
        // Driven by the declared columns rather than by the row, so a short row leaves blank cells
        // instead of a ragged table and a long one cannot push past the header.
        for (let column = 0; column < node.columns.length; column++) {
          line.appendChild(element("td", undefined, row[column] ?? ""));
        }
      }
      return table;
    }

    case "button": {
      const button = tone(
        element("button", "button", text(node.label)),
        node.tone,
      );
      button.addEventListener("click", () =>
        onAction(node.action, node.payload),
      );
      return button;
    }

    case "input": {
      const input = element("input", "input");
      input.value = text(node.value);
      if (node.placeholder) input.placeholder = node.placeholder;
      input.addEventListener("input", () => onAction(node.action, input.value));
      return input;
    }

    case "when":
      // `resolveLayout` picks the branch, so nothing conditional reaches here.
      return element("div");
  }
}

/** Replaces everything shown. A tab owns its whole page, so a redraw is the whole page. */
export function renderInto(
  root: HTMLElement,
  node: UiNode,
  onAction: ActionHandler,
): void {
  root.replaceChildren(renderNode(node, onAction));
}
