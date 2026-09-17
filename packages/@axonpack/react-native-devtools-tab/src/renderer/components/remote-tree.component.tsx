import {
  createElement,
  useSyncExternalStore,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  Image,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native-web";

import {
  isHandler,
  type RemoteProps,
} from "../../core/constants/remote-op.const";
import type {
  RemoteNode,
  RemoteReceiver,
} from "../services/remote-receiver.service";

/**
 * The tab, drawn by react-native-web.
 *
 * A tab written with `View` and `Text` reaches the panel as the host elements React Native compiles
 * those to: `RCTView`, `RCTText`, and props shaped for a native view. Nothing here translates them.
 * The map below picks the react-native-web component for each host name and hands it the props
 * untouched, and react-native-web does what it does on the web: Yoga's defaults, units, text
 * layout, its own stylesheet in this page's `head`.
 *
 * A tab written with `div` and `button` is a plain string type, so React builds an ordinary DOM
 * element for it. The two kinds sit in one tree without knowing about each other.
 */

const NATIVE: Record<string, ComponentType<Record<string, unknown>>> = {
  RCTView: View,
  RCTSafeAreaView: View,
  // react-native-safe-area-context, which is what an app actually uses for this.
  RNCSafeAreaView: View,
  RNCSafeAreaProvider: View,
  RCTModalHostView: View,
  RCTScrollContentView: View,
  AndroidHorizontalScrollContentView: View,
  RCTScrollView: ScrollView,
  AndroidHorizontalScrollView: ScrollView,
  RCTText: Text,
  RCTVirtualText: Text,
  RCTSelectableText: Text,
  RCTImageView: Image,
  RCTSinglelineTextInputView: TextInput,
  RCTMultilineTextInputView: TextInput,
  AndroidTextInput: TextInput,
  RCTSwitch: Switch,
};

/**
 * A host name this map has never seen is still React Native's, so it is laid out, not dropped.
 *
 * Told apart by the first letter, because that is the one rule both sides keep: HTML tags are
 * lowercase, and every native component's registered name is capitalised. Matching on `RCT` missed
 * every library that names its own, and there are a lot of those: `RNCSafeAreaView`, `RNSScreen`,
 * `RNSVGPath`. Each one came out as an element the browser had never heard of, which is invisible.
 */
function componentFor(
  type: string,
): ComponentType<Record<string, unknown>> | string {
  if (NATIVE[type]) return NATIVE[type];
  return /^[A-Z]/.test(type) ? View : type;
}

/**
 * Enough of an event to act on, since the event itself cannot cross.
 *
 * Shaped like the real one rather than flattened, so a handler written the ordinary way
 * (`event.target.value`) reads the same in the app as it would in a browser. `target` and
 * `currentTarget` are the same object on purpose: React Native's own press handling compares them
 * and gives up when they differ, which is how a `Pressable` in a tab still answers.
 */
function describe(event: {
  type?: string;
  key?: string;
  target?: { value?: unknown; checked?: unknown } | null;
}): unknown {
  const fields = {
    value: event.target?.value,
    checked: event.target?.checked,
  };

  return {
    type: event.type,
    key: event.key,
    target: fields,
    currentTarget: fields,
  };
}

/**
 * React Native's responder protocol, which must not reach react-native-web.
 *
 * Both implement gestures and both spell the props the same way, but they are not the same system,
 * and these cannot work across a wire in any case: `onStartShouldSetResponder` decides a press by
 * what it *returns*, and an answer from a device arrives long after the browser needed it. Handed on
 * anyway, they switch on react-native-web's own responder system, which then opens a press
 * negotiation on every `mousedown`, never gets its answer, and sits on top of the real handler.
 *
 * The press itself does not need them. React Native's `Pressability` sets a plain `onClick` at
 * render time, and a prop is a thing that crosses.
 */
const RESPONDER =
  /^on(Start|Move|Scroll|SelectionChange)ShouldSetResponder(Capture)?$|^onResponder/;

/** A function prop crossed as a name. This puts a function back, which calls that name home. */
function bind(
  props: RemoteProps,
  send: (handler: string, payload: unknown) => void,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    if (RESPONDER.test(key)) continue;

    out[key] = isHandler(value)
      ? (event: Parameters<typeof describe>[0]) =>
          send(value.handler, describe(event ?? {}))
      : value;
  }

  return out;
}

function element(
  node: RemoteNode,
  send: (handler: string, payload: unknown) => void,
): ReactNode {
  if (node.type === "#text") return node.text;

  const children = node.children.map((child) => element(child, send));

  return createElement(
    componentFor(node.type),
    { ...bind(node.props, send), key: node.id },
    ...children,
  );
}

export function RemoteTree({
  receiver,
  send,
}: {
  receiver: RemoteReceiver;
  send: (handler: string, payload: unknown) => void;
}): ReactNode {
  // The tree is mutated in place by `apply`, so the version is the snapshot and the tree is read
  // during the render it causes.
  useSyncExternalStore(receiver.subscribe, receiver.version, receiver.version);

  return receiver.root.children.map((child) => element(child, send));
}
