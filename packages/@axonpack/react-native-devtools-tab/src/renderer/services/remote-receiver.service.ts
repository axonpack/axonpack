import {
  ROOT,
  type RemoteOp,
  type RemoteProps,
} from "../../core/constants/remote-op.const";

/**
 * The tree the app's React drew, kept as data for the panel to render.
 *
 * This used to build DOM nodes itself, one `document.createElement` per op. It cannot any more: a
 * tab written with `View` and `Text` arrives as the host elements React Native compiles those to,
 * and turning `RCTView` into a `div` by hand means reimplementing Yoga's defaults, RN's units and
 * its text layout. react-native-web already is that, exactly, and it is a browser library, so it
 * runs here. Handing it a tree means this side holds nodes rather than elements and React does the
 * building.
 *
 * Kept as mutations applied to one tree, as before. React then diffs, so the element under a caret
 * or a scrolled list survives a render above it for the same reason it did when this patched the
 * DOM directly.
 */

export type RemoteNode = {
  id: number;
  type: string;
  props: RemoteProps;
  children: RemoteNode[];
  text?: string;
};

export type RemoteReceiver = {
  apply: (ops: RemoteOp[]) => void;
  /** The root's children are what a tab drew. Mutated in place, so read it after a change. */
  root: RemoteNode;
  /** Bumped on every applied batch, which is what a `useSyncExternalStore` snapshot can watch. */
  version: () => number;
  subscribe: (listener: () => void) => () => void;
};

export function createRemoteReceiver(): RemoteReceiver {
  const root: RemoteNode = { id: ROOT, type: "#root", props: {}, children: [] };
  const nodes = new Map<number, RemoteNode>([[ROOT, root]]);
  const listeners = new Set<() => void>();
  let version = 0;

  /** A removed subtree's ids are dropped too, so a later op cannot reach a node that is gone. */
  const forget = (node: RemoteNode): void => {
    nodes.delete(node.id);
    for (const child of node.children) forget(child);
  };

  return {
    root,
    version: () => version,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    apply(ops) {
      for (const op of ops) {
        switch (op.op) {
          case "clear":
            // Only what is on screen. React sends this partway through the first commit, after it
            // has already created the nodes it is about to append, so dropping the ids here would
            // throw away the tree it is in the middle of building.
            root.children = [];
            break;

          case "create":
            nodes.set(op.id, {
              id: op.id,
              type: op.type,
              props: op.props,
              children: [],
            });
            break;

          case "text":
            nodes.set(op.id, {
              id: op.id,
              type: "#text",
              props: {},
              children: [],
              text: op.text,
            });
            break;

          case "append": {
            const parent = nodes.get(op.parent);
            const child = nodes.get(op.child);
            if (parent && child) parent.children.push(child);
            break;
          }

          case "insert": {
            const parent = nodes.get(op.parent);
            const child = nodes.get(op.child);
            const before = nodes.get(op.before);
            if (!parent || !child) break;
            // React reorders by inserting a node it has already placed, so this moves rather than
            // copies. Leaving the old position alone put the same node on screen twice.
            const from = parent.children.indexOf(child);
            if (from >= 0) parent.children.splice(from, 1);
            const at = before ? parent.children.indexOf(before) : -1;
            parent.children.splice(
              at < 0 ? parent.children.length : at,
              0,
              child,
            );
            break;
          }

          case "remove": {
            const parent = nodes.get(op.parent);
            const child = nodes.get(op.child);
            if (!parent || !child) break;
            const at = parent.children.indexOf(child);
            if (at >= 0) parent.children.splice(at, 1);
            forget(child);
            break;
          }

          case "update": {
            const node = nodes.get(op.id);
            if (!node) break;
            // A prop React dropped arrives as null rather than by absence, so it is deleted here
            // instead of being handed on as a null the renderer would try to apply.
            const props = { ...node.props };
            for (const [key, value] of Object.entries(op.props)) {
              if (value === null) delete props[key];
              else props[key] = value;
            }
            node.props = props;
            break;
          }

          case "retext": {
            const node = nodes.get(op.id);
            if (node) node.text = op.text;
            break;
          }
        }
      }

      version++;
      for (const listener of listeners) listener();
    },
  };
}
