/// <reference path="../react-reconciler.d.ts" />
import type { ReactNode } from "react";
import createReconciler from "react-reconciler";
import { DefaultEventPriority } from "react-reconciler/constants";

import {
  ROOT,
  type RemoteOp,
  type RemoteProps,
} from "../../core/constants/remote-op.const";

/**
 * Runs a consumer's React component in the app, and reports what it drew.
 *
 * A component cannot be sent to the panel: it is a function, its closure lives in this engine, and
 * only data crosses the debugger channel. So React runs here instead, against a renderer whose
 * "DOM" is a list of numbered nodes, and the panel builds real elements from the changes that
 * arrive. Hooks, effects, context and every other React feature work, because this is React.
 *
 * What does not work is anything that reaches for a real element: a `ref` gets one of these
 * stand-ins, so a canvas, a measurement or a third-party DOM widget has nothing to hold. Those
 * belong in a `page`, which is built for the browser and runs there.
 */

type Instance = {
  id: number;
  type: string;
  children: Instance[];
  props: RemoteProps;
  text?: string;
};

/** The app's end: React commits here, and the changes go out. */
export type RemoteSender = {
  /** Draws `element`, or unmounts when given null. */
  render: (element: ReactNode) => void;
  /** Every op needed to build what is currently drawn, for a panel that just opened. */
  replay: () => RemoteOp[];
  /** Runs the function a `create`/`update` swapped out, if it is still the current one. */
  /** `payload` is the arguments the panel's callback was called with. */
  dispatch: (handler: string, payload: unknown) => void;
};

export function createRemoteSender(
  emit: (ops: RemoteOp[]) => void,
): RemoteSender {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  let pending: RemoteOp[] = [];
  let nextId = ROOT + 1;

  const root: Instance = { id: ROOT, type: "#root", children: [], props: {} };

  /**
   * Strips what cannot be sent: `children` is React's own bookkeeping and the panel builds the tree
   * from the ops instead, and a function is swapped for a name the panel can call back with.
   */
  const sendable = (id: number, props: RemoteProps): RemoteProps => {
    const out: RemoteProps = {};

    for (const [key, value] of Object.entries(props)) {
      if (LOCAL_ONLY.has(key)) continue;

      if (typeof value === "function") {
        const name = `${id}:${key}`;
        handlers.set(name, value as (payload: unknown) => void);
        out[key] = { handler: name };
        continue;
      }

      // Anything else has to survive JSON, and a value that does not would arrive as null and be
      // applied as one, which is worse than never sending it.
      if (value === undefined || typeof value === "symbol") continue;
      out[key] = value;
    }

    return out;
  };

  /**
   * What changed, including what went.
   *
   * A prop React dropped has to be named as gone rather than left out. The panel applies what it is
   * handed and touches nothing else, so a key that merely stops appearing would leave the old value
   * on the element for the rest of the session.
   */
  const changed = (
    id: number,
    prev: RemoteProps,
    next: RemoteProps,
  ): RemoteProps => {
    const out = sendable(id, next);

    for (const key of Object.keys(prev)) {
      if (key in out || LOCAL_ONLY.has(key)) continue;
      out[key] = null;
    }

    return out;
  };

  // One reconciler per sender, not one shared. React commits long after `render` returns, when an
  // effect or a `setState` fires, so a shared one would have to be told which tab it was working for
  // at a moment nothing is in a position to tell it.
  const append = (parent: Instance, child: Instance): void => {
    parent.children.push(child);
    pending.push({ op: "append", parent: parent.id, child: child.id });
  };

  const insert = (
    parent: Instance,
    child: Instance,
    before: Instance,
  ): void => {
    const at = parent.children.indexOf(before);
    parent.children.splice(at < 0 ? parent.children.length : at, 0, child);
    pending.push({
      op: "insert",
      parent: parent.id,
      child: child.id,
      before: before.id,
    });
  };

  const remove = (parent: Instance, child: Instance): void => {
    const at = parent.children.indexOf(child);
    if (at >= 0) parent.children.splice(at, 1);
    forget(child);
    pending.push({ op: "remove", parent: parent.id, child: child.id });
  };

  const host: Record<string, unknown> = {
    ...staticHostConfig(),

    createInstance(type: string, props: RemoteProps): Instance {
      const instance: Instance = {
        id: nextId++,
        type,
        children: [],
        props,
        ...standIn(),
      };
      pending.push({
        op: "create",
        id: instance.id,
        type,
        props: sendable(instance.id, props),
      });
      return instance;
    },

    createTextInstance(text: string): Instance {
      const instance: Instance = {
        id: nextId++,
        type: "#text",
        children: [],
        props: {},
        text,
      };
      pending.push({ op: "text", id: instance.id, text });
      return instance;
    },

    // A container is just another parent here, so the four "…Container" variants are the same three
    // functions under a second name.
    appendInitialChild: append,
    appendChild: append,
    appendChildToContainer: append,
    insertBefore: insert,
    insertInContainerBefore: insert,
    removeChild: remove,
    removeChildFromContainer: remove,

    commitUpdate(
      instance: Instance,
      _type: string,
      prev: RemoteProps,
      next: RemoteProps,
    ): void {
      pending.push({
        op: "update",
        id: instance.id,
        props: changed(instance.id, prev, next),
      });
      instance.props = next;
    },

    commitTextUpdate(instance: Instance, _prev: string, next: string): void {
      instance.text = next;
      pending.push({ op: "retext", id: instance.id, text: next });
    },

    clearContainer(container: Instance): void {
      container.children = [];
      pending.push({ op: "clear" });
    },

    // One message per commit rather than one per mutation, so a render that moves twenty nodes
    // crosses the debugger connection once.
    resetAfterCommit(): void {
      if (pending.length === 0) return;
      const ops = pending;
      pending = [];
      emit(ops);
    },
  };

  /** A removed node's handlers would otherwise keep answering for a button that is gone. */
  const forget = (instance: Instance): void => {
    for (const key of handlers.keys()) {
      if (key.startsWith(`${instance.id}:`)) handlers.delete(key);
    }
    for (const child of instance.children) forget(child);
  };

  const reconciler = createReconciler(host);

  const container = reconciler.createContainer(
    root,
    0,
    null,
    false,
    null,
    "",
    (error: unknown) => {
      console.error("[devtools] a tab component failed", error);
    },
    null,
    null,
  );

  return {
    render(element) {
      reconciler.updateContainer(element, container, null, null);
    },

    replay() {
      const ops: RemoteOp[] = [{ op: "clear" }];

      const walk = (instance: Instance): void => {
        for (const child of instance.children) {
          if (child.text !== undefined) {
            ops.push({ op: "text", id: child.id, text: child.text });
          } else {
            ops.push({
              op: "create",
              id: child.id,
              type: child.type,
              props: sendable(child.id, child.props),
            });
          }
          walk(child);
          ops.push({ op: "append", parent: instance.id, child: child.id });
        }
      };

      walk(root);
      return ops;
    },

    dispatch(handler, payload) {
      // The panel sends what the callback was called with, so this calls it with the same. An older
      // panel sent one event and nothing else, which arrives here as a single argument either way.
      const args = Array.isArray(payload) ? payload : [payload];
      handlers.get(handler)?.(...args.map(asEvent));
    },
  };
}

/**
 * What a `ref` gets, and why it answers at all.
 *
 * There is no element on this side, so a ref holds one of these. It used to hold only the node, and
 * React Native's own components call methods on a ref as a matter of course: `TextInput` focuses
 * one, `ScrollView` scrolls one, anything animated sets props on one. Each of those was a
 * `TypeError: undefined is not a function` the moment somebody used the component the ordinary way.
 *
 * So they are here, and they do nothing. A measurement answers zeroes rather than refusing, because
 * a layout that reads one wants a number and not a crash. What cannot be faked is a command: React
 * Native sends those to a native view by handle, sees this is not one, and says so. That warning is
 * the honest report of a thing this package cannot do.
 */
function standIn(): Record<string, unknown> {
  const nothing = (): void => undefined;

  return {
    focus: nothing,
    blur: nothing,
    setNativeProps: nothing,
    // Six zeroes: x, y, width, height, pageX, pageY.
    measure: (back: (...box: number[]) => void) => back(0, 0, 0, 0, 0, 0),
    measureInWindow: (back: (...box: number[]) => void) => back(0, 0, 0, 0),
    measureLayout: (_relative: unknown, back: (...box: number[]) => void) =>
      back(0, 0, 0, 0),
  };
}

/** React's own bookkeeping, or a thing that cannot cross. Never sent, never named as gone. */
const LOCAL_ONLY = new Set(["children", "ref", "key"]);

/**
 * What a handler is handed in place of the event.
 *
 * The event itself cannot cross, so the panel sends a description of it and this puts back the two
 * methods every other handler reaches for. They do nothing: the browser finished with the event
 * before this runs, and there is nothing left to cancel.
 *
 * A handler gets `type`, `key`, and `value`/`checked` on both `target` and `currentTarget`. That is
 * all of it. **Everything else is missing**, including `preventDefault` having any effect,
 * `relatedTarget`, coordinates, modifier flags, `dataTransfer`, and the element itself. React's
 * event types still describe the full event, so TypeScript will not stop you reading a field that
 * arrives undefined.
 *
 * `currentTarget` is put back as the same object as `target`, which is how the panel sent it. JSON
 * has no notion of two names for one object, so it writes the thing twice and parsing gives two.
 * React Native's `Pressability` compares them to decide whether a click was really meant for the
 * element it is on, and two equal-looking objects are not equal, so every press on a `Pressable`
 * or a `TouchableOpacity` was being dropped at that line.
 */
function asEvent(payload: unknown): unknown {
  if (typeof payload !== "object" || payload === null) return payload;
  // A plain value that happens to be an object, a style or a row, is an argument and not an event.
  if (!("currentTarget" in payload) && !("nativeEvent" in payload))
    return payload;

  const event: Record<string, unknown> = {
    preventDefault: () => undefined,
    stopPropagation: () => undefined,
    ...payload,
  };

  if (event.target != null && event.currentTarget != null)
    event.currentTarget = event.target;

  return event;
}

/** Everything React asks for that has nothing to do with this package. */
function staticHostConfig(): Record<string, unknown> {
  let priority = DefaultEventPriority;

  return {
    supportsMutation: true,
    supportsPersistence: false,
    supportsHydration: false,
    supportsResources: false,
    supportsSingletons: false,
    supportsTestSelectors: false,
    supportsMicrotasks: true,
    isPrimaryRenderer: true,
    warnsIfNotActing: false,
    rendererPackageName: "@axonpack/react-native-devtools-tab",
    rendererVersion: "0",

    noTimeout: -1,
    scheduleTimeout: setTimeout,
    cancelTimeout: clearTimeout,
    scheduleMicrotask: queueMicrotask,

    finalizeInitialChildren: () => false,
    shouldSetTextContent: () => false,
    // Asserted to be non-null by React, so it is an object rather than the null it might look like.
    getRootHostContext: () => ({}),
    getChildHostContext: (parent: unknown) => parent,
    getPublicInstance: (instance: unknown) => instance,
    prepareForCommit: () => null,
    preparePortalMount: () => undefined,
    detachDeletedInstance: () => undefined,
    resetTextContent: () => undefined,
    hideInstance: () => undefined,
    unhideInstance: () => undefined,
    hideTextInstance: () => undefined,
    unhideTextInstance: () => undefined,

    getInstanceFromNode: () => null,
    getInstanceFromScope: () => null,
    beforeActiveInstanceBlur: () => undefined,
    afterActiveInstanceBlur: () => undefined,
    prepareScopeUpdate: () => undefined,

    setCurrentUpdatePriority: (next: number) => {
      priority = next;
    },
    getCurrentUpdatePriority: () => priority,
    resolveUpdatePriority: () => priority || DefaultEventPriority,
    shouldAttemptEagerTransition: () => false,
    requestPostPaintCallback: () => undefined,
    trackSchedulerEvent: () => undefined,
    resolveEventType: () => null,
    resolveEventTimeStamp: () => -1.1,

    maySuspendCommit: () => false,
    maySuspendCommitInSyncRender: () => false,
    maySuspendCommitOnUpdate: () => false,
    preloadInstance: () => true,
    startSuspendingCommit: () => undefined,
    suspendInstance: () => undefined,
    suspendOnActiveViewTransition: () => undefined,
    waitForCommitToBeReady: () => null,
    shouldDeleteUnhydratedTailInstances: () => false,
    isSingletonScope: () => false,
    NotPendingTransition: null,
    HostTransitionContext: {
      $$typeof: Symbol.for("react.context"),
      Provider: null,
      Consumer: null,
      _currentValue: null,
      _currentValue2: null,
      _threadCount: 0,
    },
    resetFormInstance: () => undefined,
    bindToConsole: () => () => undefined,
  };
}
