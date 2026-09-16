/**
 * The vocabulary a tab's layout is written in.
 *
 * A layout is registered once and never sent again. Where it needs a value it holds a `Ref` instead,
 * naming a path into that tab's state, and the panel resolves those every time the state changes.
 * That is what keeps the app sending data rather than sending pictures of data.
 *
 * Both ends compile against this file, so a node added here is available to both at once.
 */

/** Colour intent, resolved against the panel's stylesheet rather than to a specific colour. */
export type UiTone = "default" | "muted" | "success" | "warning" | "error";

/**
 * A hole in the layout, filled from state.
 *
 * `path` is dotted, and its first segment is the slice: `rows` reads a whole slice, `user.email`
 * reads into one. The first segment is also what decides whether a state update re-renders this tab,
 * so referring to `user.email` means an update to `user` redraws and an update to `other` does not.
 */
export type Ref = { $ref: string };

/** A value a node can hold: given outright, or read from state. */
export type Bound<T> = T | Ref;

export function ref(path: string): Ref {
  return { $ref: path };
}

export function isRef(value: unknown): value is Ref {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Ref).$ref === "string"
  );
}

/** The slice a path belongs to, which is the unit state updates and re-renders are counted in. */
export function sliceOf(path: string): string {
  return path.split(".")[0] ?? path;
}

export type UiNode =
  /** A line of text. */
  | { kind: "text"; value: Bound<string>; tone?: UiTone }
  /** A section title. */
  | { kind: "heading"; value: Bound<string> }
  /** A small pill, for a status or a count. */
  | { kind: "badge"; value: Bound<string>; tone?: UiTone }
  /** Children side by side. */
  | { kind: "row"; children: UiNode[] }
  /** Children one above the other. */
  | { kind: "stack"; children: UiNode[] }
  /** A labelled pair, laid out as one line. */
  | { kind: "field"; label: string; value: Bound<string>; tone?: UiTone }
  /** A grid. Every row is expected to be as long as `columns`; short rows render blank cells. */
  | { kind: "table"; columns: string[]; rows: Bound<string[][]> }
  /** Any value, pretty-printed. */
  | { kind: "json"; value: Bound<unknown> }
  /** Sends `{ action, payload }` to the app when pressed. */
  | {
      kind: "button";
      label: Bound<string>;
      action: string;
      payload?: unknown;
      tone?: UiTone;
    }
  /** Sends `{ action, payload: text }` to the app as it is typed. */
  | {
      kind: "input";
      action: string;
      value?: Bound<string>;
      placeholder?: string;
    }
  /** A horizontal rule. */
  | { kind: "divider" }
  /**
   * Renders `show` while the referenced value is truthy, `otherwise` when it is not.
   *
   * Named `show` rather than `then` because an object with a `then` key is thenable: awaiting a
   * layout anywhere would try to call it and fail.
   */
  | { kind: "when"; value: Ref; show: UiNode; otherwise?: UiNode };
