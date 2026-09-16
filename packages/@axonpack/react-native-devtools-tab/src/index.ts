import { createElement, type ComponentType } from "react";

import { DEVTOOLS_ID } from "./core/constants/devtools.const";
import {
  ACTION,
  HELLO,
  MUTATE,
  REGISTER,
} from "./core/constants/message.const";
import type {
  TabAction,
  TabMutation,
  TabRegistration,
} from "./core/constants/message.const";
import {
  createMessageChannel,
  type MessageChannel,
} from "./core/services/message-channel.service";
import {
  createRemote,
  expose,
  type Remote,
  type RemoteMethods,
} from "./core/services/remote.service";
import { connectFuseboxTransport } from "./device/services/fusebox-channel.service";
import {
  createRemoteTree,
  type RemoteTree,
} from "./device/services/remote-renderer.service";

export type {
  MessageChannel,
  MessageListener,
} from "./core/services/message-channel.service";
export type { Remote, RemoteMethods } from "./core/services/remote.service";

const channel = createMessageChannel();
const registrations = new Map<string, TabRegistration>();
const trees = new Map<string, RemoteTree>();

void connectFuseboxTransport(DEVTOOLS_ID).then((transport) => {
  if (transport) channel.attach(transport);
});

// A panel opened after the app started has missed every registration, so it asks rather than
// waiting. Answering with everything held is also what makes reloading the panel recover.
channel.onMessage(HELLO, () => {
  for (const registration of registrations.values()) {
    channel.send(REGISTER, registration);

    // The changes that built this tab went to a panel that was not there. Its tree is replayed as
    // though it were being drawn for the first time, which is what keeps a component's own state
    // through a panel reload: it is never re-mounted.
    const tree = trees.get(registration.id);
    if (tree) {
      channel.send(MUTATE, {
        id: registration.id,
        ops: tree.replay(),
      } satisfies TabMutation);
    }
  }
});

export type TabOptions = {
  /** Identifies the tab among this app's tabs. */
  id: string;
  /** The label in the DevTools tab strip. */
  name: string;
  /**
   * A symbol shown after the tab's name. Defaults to the Axonpack mark.
   *
   * Text rather than an image: React Native DevTools' own icon slots take an element, and every way
   * of putting one there loses its drawing. Any character works, so an emoji does too.
   */
  icon?: string;
  /**
   * What the tab draws.
   *
   * Ordinary React: hooks, effects, context, any component it composes. It runs **in the app**, not
   * in the panel, against a renderer that reports what it drew instead of touching a DOM, and the
   * panel builds the real elements from that. So `useState` redraws the tab, and a handler runs
   * here, where the app's own state already is.
   *
   * That is also why the JSX is `div` and `button` rather than `View` and `Pressable`: the elements
   * are made at the other end, in a browser.
   *
   * What it cannot do is touch a real element, because there isn't one on this side. A `ref` holds a
   * stand-in, so a canvas, a measurement or a DOM library has nothing to work with, and an event
   * arrives as a description of itself rather than the event.
   */
  component: ComponentType;
};

/**
 * The app's side of React Native DevTools.
 *
 * A single object, because an app has exactly one debugger connection: there is nothing for a
 * factory to vary and nothing to pass around. Usable immediately, too. Anything sent before somebody
 * opens DevTools is kept and flushed when they do, and a release build has no connection at all, so
 * this stays quiet.
 *
 * ```tsx
 * function Session() {
 *   const [user, setUser] = useState('nobody');
 *   useEffect(() => auth.onChange(setUser), []);
 *
 *   return (
 *     <div>
 *       <p>signed in as {user}</p>
 *       <button onClick={() => auth.signOut()}>sign out</button>
 *     </div>
 *   );
 * }
 *
 * ReactNativeDevtoolsPanel.registerTab({
 *   id: 'session',
 *   name: 'Session',
 *   component: Session,
 * });
 * ```
 *
 * `send`, `onMessage`, `request`, `handle`, `expose` and `remote` are the channel underneath, for
 * talking to anything else listening on this app's debugger connection.
 */
export type ReactNativeDevtoolsPanel = MessageChannel & {
  /** Adds a tab to React Native DevTools. Call it once per tab, as many times as you have tabs. */
  registerTab: (options: TabOptions) => void;
  /** Offers an object's functions to the far end. Call the returned function to withdraw them. */
  expose: <T extends RemoteMethods>(methods: T) => () => void;
  /** A typed handle on what the far end exposed, callable as if its functions were local. */
  remote: <T extends RemoteMethods>() => Remote<T>;
};

function registerTab(options: TabOptions): void {
  const registration: TabRegistration = {
    id: options.id,
    name: options.name,
    icon: options.icon,
  };
  registrations.set(options.id, registration);
  channel.send(REGISTER, registration);

  const tree = createRemoteTree((ops) =>
    channel.send(MUTATE, { id: options.id, ops } satisfies TabMutation),
  );
  trees.set(options.id, tree);

  // A handler is named by where it sits in the tree rather than by a name somebody chose, so it
  // needs no registering and two tabs cannot collide.
  channel.onMessage(ACTION, (payload) => {
    const event = payload as TabAction;
    if (event?.id === options.id) tree.dispatch(event.action, event.payload);
  });

  // After the registration, so the panel has the tab before anything arrives for it to draw.
  tree.render(createElement(options.component));
}

export const ReactNativeDevtoolsPanel: ReactNativeDevtoolsPanel = {
  send: (type, payload) => channel.send(type, payload),
  onMessage: (type, listener) => channel.onMessage(type, listener),
  request: (method, params, options) =>
    channel.request(method, params, options),
  handle: (method, handler) => channel.handle(method, handler),
  registerTab,
  expose: (methods) => expose(channel, methods),
  remote: () => createRemote(channel),
};
