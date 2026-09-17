/**
 * What a rendered component looks like on the wire.
 *
 * The app runs React and the panel owns the DOM, so what crosses is neither a component nor a
 * picture of one: it is the list of changes React just made, replayed against real nodes at the far
 * end. Nodes are named by number, and the panel keeps its own map from those numbers to elements.
 *
 * Kept as mutations rather than as a fresh tree each render, because replacing the tree would take
 * the focus and the caret out of whatever input the user is typing in.
 */

/** The container. Not an instance, so it has no id of its own. */
export const ROOT = 0;

export type RemoteProps = Record<string, unknown>;

/** A function prop, which cannot cross. The panel calls back with this name instead. */
export type RemoteHandler = { handler: string };

export function isHandler(value: unknown): value is RemoteHandler {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as RemoteHandler).handler === "string"
  );
}

export type RemoteOp =
  | { op: "create"; id: number; type: string; props: RemoteProps }
  | { op: "text"; id: number; text: string }
  | { op: "append"; parent: number; child: number }
  | { op: "insert"; parent: number; child: number; before: number }
  | { op: "remove"; parent: number; child: number }
  | { op: "update"; id: number; props: RemoteProps }
  | { op: "retext"; id: number; text: string }
  /** Everything the panel holds is stale: it is being sent the tree from the start. */
  | { op: "clear" };
