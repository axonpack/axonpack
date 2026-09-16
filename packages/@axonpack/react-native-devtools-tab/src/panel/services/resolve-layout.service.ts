import {
  isRef,
  sliceOf,
  type Bound,
  type UiNode,
} from "../../core/constants/ui-node.const";

/**
 * Filling a layout's holes from state, and working out which holes a layout has.
 *
 * The layout is registered once and kept. Every redraw resolves it against the state the panel holds
 * now, which is what lets the app send only the data.
 */

/** Reads a dotted path. A missing step yields `undefined` rather than throwing on a partial state. */
function read(state: Record<string, unknown>, path: string): unknown {
  let value: unknown = state;
  for (const step of path.split(".")) {
    if (value === null || typeof value !== "object") return undefined;
    value = (value as Record<string, unknown>)[step];
  }
  return value;
}

function bound<T>(
  value: Bound<T> | undefined,
  state: Record<string, unknown>,
): T | undefined {
  return isRef(value)
    ? (read(state, value.$ref) as T)
    : (value as T | undefined);
}

/** A layout with every `Ref` replaced by what state holds for it. */
export function resolveLayout(
  node: UiNode,
  state: Record<string, unknown>,
): UiNode {
  switch (node.kind) {
    case "text":
    case "heading":
    case "badge":
      return { ...node, value: String(bound(node.value, state) ?? "") };

    case "field":
      return { ...node, value: String(bound(node.value, state) ?? "") };

    case "button":
      return { ...node, label: String(bound(node.label, state) ?? "") };

    case "input":
      return { ...node, value: String(bound(node.value, state) ?? "") };

    case "json":
      return { ...node, value: bound(node.value, state) };

    case "table":
      return { ...node, rows: (bound(node.rows, state) as string[][]) ?? [] };

    case "row":
    case "stack":
      return {
        ...node,
        children: node.children.map((child) => resolveLayout(child, state)),
      };

    case "when": {
      const branch = read(state, node.value.$ref) ? node.show : node.otherwise;
      // An absent `otherwise` renders nothing rather than disappearing from its parent's layout,
      // which would make a row jump around as a flag toggles.
      return branch
        ? resolveLayout(branch, state)
        : { kind: "text", value: "" };
    }

    case "divider":
      return node;
  }
}

/**
 * Every slice the layout reads.
 *
 * Computed once when a tab registers, and then compared against each update: a tab redraws only when
 * a slice it actually names has changed. That is the whole of the optimisation, and it is enough,
 * because a slice is the unit the app updates in.
 */
export function slicesOf(node: UiNode, found = new Set<string>()): Set<string> {
  const note = (value: unknown) => {
    if (isRef(value)) found.add(sliceOf(value.$ref));
  };

  switch (node.kind) {
    case "text":
    case "heading":
    case "badge":
    case "field":
      note(node.value);
      break;
    case "button":
      note(node.label);
      break;
    case "input":
      note(node.value);
      break;
    case "json":
      note(node.value);
      break;
    case "table":
      note(node.rows);
      break;
    case "row":
    case "stack":
      for (const child of node.children) slicesOf(child, found);
      break;
    case "when":
      note(node.value);
      slicesOf(node.show, found);
      if (node.otherwise) slicesOf(node.otherwise, found);
      break;
    case "divider":
      break;
  }

  return found;
}
