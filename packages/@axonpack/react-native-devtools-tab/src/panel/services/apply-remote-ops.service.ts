import {
  isHandler,
  ROOT,
  type RemoteOp,
  type RemoteProps,
} from "../../core/constants/remote-op.const";

/**
 * Builds the DOM the app's React drew.
 *
 * Changes are applied to the nodes that are already there rather than to a tree built fresh each
 * time, which is what keeps focus, the caret and scroll position where the user left them while a
 * component above re-renders.
 *
 * Plain DOM, no framework: React is already running, one engine over.
 */

export type RemoteRoot = {
  apply: (ops: RemoteOp[]) => void;
};

/**
 * Enough of an event to act on, since the event itself cannot cross.
 *
 * Shaped like the real one rather than flattened, so a handler written the ordinary way
 * (`event.target.value`) reads the same here as it would in a browser, and typechecks against
 * React's own event types.
 */
function describe(event: Event): unknown {
  const target = event.target as { value?: unknown; checked?: unknown } | null;
  const fields = { value: target?.value, checked: target?.checked };

  return { type: event.type, target: fields, currentTarget: fields };
}

export function createRemoteRoot(
  container: HTMLElement,
  send: (handler: string, payload: unknown) => void,
): RemoteRoot {
  const nodes = new Map<number, Node>([[ROOT, container]]);
  /** Per node, so re-applying props can take the old listener off before putting a new one on. */
  const listeners = new Map<number, Map<string, EventListener>>();

  const nodeAt = (id: number): Node | undefined => nodes.get(id);

  const applyProps = (
    id: number,
    element: HTMLElement,
    props: RemoteProps,
  ): void => {
    const bound = listeners.get(id) ?? new Map<string, EventListener>();
    listeners.set(id, bound);

    for (const [name, listener] of bound) {
      element.removeEventListener(name, listener);
    }
    bound.clear();

    for (const [key, value] of Object.entries(props)) {
      if (isHandler(value)) {
        // `onClick` is React's spelling of the DOM's `click`.
        const name = key.slice(2).toLowerCase();
        const listener = (event: Event): void =>
          send(value.handler, describe(event));
        bound.set(name, listener);
        element.addEventListener(name, listener);
        continue;
      }

      if (key === "style" && typeof value === "object" && value !== null) {
        element.removeAttribute("style");
        Object.assign(element.style, value);
        continue;
      }

      if (key === "className") {
        element.className = String(value ?? "");
        continue;
      }

      // `value` and `checked` are properties rather than attributes: setting the attribute moves the
      // default, not what is shown, so a controlled input would stop following what React says.
      if (key === "value" || key === "checked") {
        (element as unknown as RemoteProps)[key] = value;
        continue;
      }

      if (value === false || value === null || value === undefined) {
        element.removeAttribute(key);
        continue;
      }

      element.setAttribute(key, value === true ? "" : String(value));
    }
  };

  return {
    apply(ops) {
      for (const op of ops) {
        switch (op.op) {
          case "clear":
            // Only what is on screen. React sends this partway through the first commit, after it
            // has already created the nodes it is about to append, so dropping the ids here would
            // throw away the tree it is in the middle of building.
            container.replaceChildren();
            break;

          case "create": {
            const element = document.createElement(op.type);
            nodes.set(op.id, element);
            applyProps(op.id, element, op.props);
            break;
          }

          case "text":
            nodes.set(op.id, document.createTextNode(op.text));
            break;

          case "append": {
            const parent = nodeAt(op.parent);
            const child = nodeAt(op.child);
            if (parent && child) parent.appendChild(child);
            break;
          }

          case "insert": {
            const parent = nodeAt(op.parent);
            const child = nodeAt(op.child);
            const before = nodeAt(op.before);
            if (parent && child) parent.insertBefore(child, before ?? null);
            break;
          }

          case "remove": {
            const parent = nodeAt(op.parent);
            const child = nodeAt(op.child);
            if (parent && child && child.parentNode === parent)
              parent.removeChild(child);
            // The id is dropped rather than kept: React never names a removed node again, and
            // holding it would hold the element too.
            nodes.delete(op.child);
            listeners.delete(op.child);
            break;
          }

          case "update": {
            const element = nodeAt(op.id);
            if (element) applyProps(op.id, element as HTMLElement, op.props);
            break;
          }

          case "retext": {
            const node = nodeAt(op.id);
            if (node) node.textContent = op.text;
            break;
          }
        }
      }
    },
  };
}
