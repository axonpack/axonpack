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
  type Remote,
  type RemoteMethods,
} from "./core/services/remote.service";
import { connectFuseboxTransport } from "./device/services/fusebox-channel.service";
import { createState, type TabState } from "./device/hooks/state.hook";
import {
  createRemoteTree,
  type RemoteTree,
} from "./device/services/remote-renderer.service";

export type {
  MessageChannel,
  MessageListener,
} from "./core/services/message-channel.service";
export type { Remote, RemoteMethods } from "./core/services/remote.service";
export type { TabState } from "./device/hooks/state.hook";

const channel = createMessageChannel();
const registrations = new Map<string, TabRegistration>();
const trees = new Map<string, RemoteTree>();
const mounts = new Map<string, () => void>();

void connectFuseboxTransport(DEVTOOLS_ID).then((transport) => {
  if (transport) channel.attach(transport);
});

// A panel opened after the app started has missed every registration, so it asks rather than
// waiting. Answering with everything held is also what makes reloading the panel recover.
channel.onMessage(HELLO, () => {
  for (const registration of registrations.values()) {
    channel.send(REGISTER, registration);

    const tree = trees.get(registration.id);

    if (tree) {
      // Already drawn once, for a panel that has since gone. Replaying the tree it holds is what
      // keeps a component's own state through a panel reload: it is never re-mounted.
      channel.send(MUTATE, {
        id: registration.id,
        ops: tree.replay(),
      } satisfies TabMutation);
    } else {
      // Nobody has ever looked at this tab, so nothing has been rendered for it. Mounting now is
      // what keeps a release build free: there is no panel to ask, so a component never runs, its
      // effects never start, and nothing it does costs anything.
      mounts.get(registration.id)?.();
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

export type Tab = {
  readonly id: string;
  /**
   * Draws the tab again, for when something the component reads has changed underneath it.
   *
   * The only thing the app ever has to tell a tab. A press inside one needs nothing at all: the
   * handler runs here, so it changes the app the way any other code would.
   *
   * ```ts
   * const session = ReactNativeDevtoolsPanel.registerTab({ id: 'session', name: 'Session', component: Session });
   *
   * function signIn(user) {
   *   current = user;
   *   session.redraw();
   * }
   * ```
   *
   * React reconciles rather than starting over, so the component keeps its own state and the panel
   * keeps the elements it already has. Cheap enough to call on every change, and free before anybody
   * opens the tab.
   */
  redraw: () => void;
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
 * `state` is how a tab and the app keep in step. `send`, `onMessage`, `request`, `handle` and
 * `remote` are the channel underneath, for talking to anything else on this app's debugger
 * connection; a tab needs none of them.
 */
export type ReactNativeDevtoolsPanel = MessageChannel & {
  /** Adds a tab to React Native DevTools. Call it once per tab, as many times as you have tabs. */
  registerTab: (options: TabOptions) => Tab;
  /**
   * A value the app and its tabs share.
   *
   * ```tsx
   * const session = ReactNativeDevtoolsPanel.state({ user: 'nobody' });
   *
   * function Session() {
   *   const { user } = session.use();
   *   return <button onClick={() => session.set({ user: 'ada' })}>signed in as {user}</button>;
   * }
   * ```
   *
   * `use()` is an ordinary hook, so the app's own screens can read the same value the same way, and
   * either side setting it redraws the other. Nothing is sent: a tab's component runs in the app, so
   * this is one object with two readers.
   */
  state: <TValue>(initial: TValue) => TabState<TValue>;
  /** A typed handle on what the far end exposed, callable as if its functions were local. */
  remote: <T extends RemoteMethods>() => Remote<T>;
};

function registerTab(options: TabOptions): Tab {
  const registration: TabRegistration = {
    id: options.id,
    name: options.name,
    icon: options.icon,
  };
  registrations.set(options.id, registration);
  channel.send(REGISTER, registration);

  const draw = (): void => {
    let tree = trees.get(options.id);

    if (!tree) {
      tree = createRemoteTree((ops) =>
        channel.send(MUTATE, { id: options.id, ops } satisfies TabMutation),
      );
      trees.set(options.id, tree);
    }

    tree.render(createElement(options.component));
  };

  mounts.set(options.id, draw);

  // A handler is named by where it sits in the tree rather than by a name somebody chose, so it
  // needs no registering and two tabs cannot collide.
  channel.onMessage(ACTION, (payload) => {
    const event = payload as TabAction;
    if (event?.id === options.id)
      trees.get(options.id)?.dispatch(event.action, event.payload);
  });

  return {
    id: options.id,
    // Nothing to draw again until somebody has opened DevTools, which is the whole of the production
    // gate: no panel, no render, no effects.
    redraw: () => {
      if (trees.has(options.id)) draw();
    },
  };
}

export const ReactNativeDevtoolsPanel: ReactNativeDevtoolsPanel = {
  send: (type, payload) => channel.send(type, payload),
  onMessage: (type, listener) => channel.onMessage(type, listener),
  request: (method, params, options) =>
    channel.request(method, params, options),
  handle: (method, handler) => channel.handle(method, handler),
  registerTab,
  state: (initial) => createState(initial),
  remote: () => createRemote(channel),
};
