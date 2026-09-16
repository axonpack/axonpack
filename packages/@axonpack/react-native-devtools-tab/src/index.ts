import { createElement, type ComponentType } from "react";

import { DEVTOOLS_ID } from "./core/constants/devtools.const";
import {
  ACTION,
  HELLO,
  MUTATE,
  REGISTER,
  STATE,
} from "./core/constants/message.const";
import type {
  TabAction,
  TabMutation,
  TabRegistration,
} from "./core/constants/message.const";
import { sliceOf, type UiNode } from "./core/constants/ui-node.const";
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
export type { UiNode, UiTone, Ref } from "./core/constants/ui-node.const";
export { ref } from "./core/constants/ui-node.const";
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

    // A tab drawing a component has already sent the changes that built it, to a panel that was not
    // there. Its current tree is replayed as though it were being drawn for the first time, which is
    // also what keeps the component's own state through a panel reload: it is never re-mounted.
    const tree = trees.get(registration.id);
    if (tree) {
      channel.send(MUTATE, {
        id: registration.id,
        ops: tree.replay(),
      } satisfies TabMutation);
    }
  }
});

export type TabOptions<TState extends Record<string, unknown>> = {
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
  /** The slices this tab reads. Each key is a slice, and updates are counted per slice. */
  state?: TState;
  /**
   * What the tab looks like, as a function of that state. Sent once, never again.
   *
   * Leave it out and give a `url` instead to draw the tab yourself.
   */
  layout?: UiNode;
  /**
   * A page of your own, shown in this tab instead of the one this package ships.
   *
   * Use it when the page is already served from somewhere: give the URL, and talk to the app from it
   * with `createPanelChannel` out of `@axonpack/react-native-devtools-tab/panel`. `setState` and
   * `onAction` still work; the page receives the same messages, and it is up to the page what to do
   * with them. For a component in your own project, use `page` instead.
   */
  url?: string;
  /**
   * A component of your own, drawn in this tab instead of the described layout.
   *
   * The path to a module whose default export is a React component, **relative to the project root**
   * rather than to this file, because it is read by the dev server rather than by the app. It is
   * built for the browser on the first request and rebuilt whenever it changes, so editing the
   * component and reloading the tab is the whole loop.
   *
   * ```ts
   * registerTab({ id: 'session', name: 'Session', page: './panel/session.tsx' });
   * ```
   *
   * Ordinary React, with hooks and whatever else you install. `@rsbuild/core`, `react` and
   * `react-dom` have to be installed in that project; they are optional peers of this package
   * because only a project showing a component needs them.
   *
   * The component itself cannot be passed here, only the path to it. The app and the panel are
   * separate JavaScript engines, so a function has nothing to send, and importing it into the app
   * would put `react-dom` in the app's own bundle.
   */
  page?: string;
  /**
   * A component of your own, drawn in this tab.
   *
   * Ordinary React: hooks, effects, context, any component it composes. It runs **in the app**, not
   * in the panel, against a renderer that reports what it drew instead of touching a DOM, and the
   * panel builds the real elements from that. So `useState` re-renders the tab, a handler runs in
   * the app where the app's own state is, and nothing has to be built or served.
   *
   * ```tsx
   * function Session() {
   *   const [user, setUser] = useState('nobody');
   *   return <button onClick={() => setUser('ada')}>{user}</button>;
   * }
   *
   * registerTab({ id: 'session', name: 'Session', component: Session });
   * ```
   *
   * What it cannot do is touch a real element, because there isn't one on this side: a `ref` holds a
   * stand-in, so a canvas, a measurement, or a third-party DOM widget has nothing to work with. Use
   * `page` for those, which is built for the browser and runs there.
   */
  component?: ComponentType;
};

export type Tab<TState extends Record<string, unknown>> = {
  readonly id: string;
  /** The state as the panel last saw it. */
  getState: () => TState;
  /**
   * Updates one or more slices. Only what changed goes over the wire, and only tabs that read a
   * changed slice redraw.
   */
  setState: (next: Partial<TState>) => void;
  /** Runs when a button in this tab is pressed, or an input in it is typed in. */
  onAction: (
    action: string,
    listener: (payload: unknown) => void,
  ) => () => void;
};

/**
 * The app's side of the channel to React Native DevTools.
 *
 * A module singleton, because an app has exactly one debugger connection. Usable immediately:
 * anything sent before somebody opens DevTools is kept and flushed when they do, and a release build
 * has no connection at all, so it stays quiet.
 *
 * `registerDevtoolsTab` is built on this. Reach for it directly for anything the tab vocabulary does
 * not cover: `send` and `onMessage`, `request`/`handle` for a call that waits for an answer, and
 * `expose`/`remote` to treat the far end's functions as local ones.
 *
 * Every method here is already bound to the one channel, so nothing takes it as an argument.
 */
/** Everything the app side does, on the one channel an app has. */
export type ReactNativeDevtoolsPanel = MessageChannel & {
  /**
   * Adds a tab to React Native DevTools. Call it once per tab, as many times as you have tabs.
   *
   * The layout crosses the wire once, here. After that only the slices you change do.
   */
  registerTab: <TState extends Record<string, unknown>>(
    options: TabOptions<TState>,
  ) => Tab<TState>;
  /** Offers an object's functions to the panel. Call the returned function to withdraw them. */
  expose: <T extends RemoteMethods>(methods: T) => () => void;
  /** A typed handle on what the panel exposed, callable as if its functions were local. */
  remote: <T extends RemoteMethods>() => Remote<T>;
};

function registerTab<TState extends Record<string, unknown>>(
  options: TabOptions<TState>,
): Tab<TState> {
  let state = { ...options.state } as TState;

  const registration: TabRegistration = {
    id: options.id,
    name: options.name,
    icon: options.icon,
    layout: options.layout,
    url: options.url,
    page: options.page,
    remote: options.component !== undefined,
    state,
  };
  registrations.set(options.id, registration);
  channel.send(REGISTER, registration);

  if (options.component) {
    const tree = createRemoteTree((ops) =>
      channel.send(MUTATE, { id: options.id, ops } satisfies TabMutation),
    );
    trees.set(options.id, tree);

    // A handler is named by where it sits in the tree rather than by a name somebody chose, so it
    // never collides with an action from a described layout and needs no registering.
    channel.onMessage(ACTION, (payload) => {
      const event = payload as TabAction;
      if (event?.id === options.id) tree.dispatch(event.action, event.payload);
    });

    // After the registration, so the panel knows the tab draws a component before anything arrives
    // for it to draw.
    tree.render(createElement(options.component));
  }

  return {
    id: options.id,
    getState: () => state,

    setState(next) {
      state = { ...state, ...next };
      // The registration keeps the current state, not the initial one, so a panel that opens later
      // or reloads is answered with what is true now.
      registration.state = state;
      channel.send(STATE, { id: options.id, state: next });
    },

    onAction(action, listener) {
      return channel.onMessage(ACTION, (payload) => {
        const event = payload as TabAction;
        if (event?.id === options.id && event.action === action)
          listener(event.payload);
      });
    },
  };
}

/**
 * The app's side of React Native DevTools.
 *
 * A single object, because an app has exactly one debugger connection: there is nothing for a
 * factory to vary and nothing to pass around. Usable immediately, too. Anything sent before somebody
 * opens DevTools is kept and flushed when they do, and a release build has no connection at all, so
 * this stays quiet.
 *
 * ```ts
 * import { ReactNativeDevtoolsPanel, ref } from '@axonpack/react-native-devtools-tab';
 *
 * const session = ReactNativeDevtoolsPanel.registerTab({
 *   id: 'session',
 *   name: 'Session',
 *   icon: 'bug',
 *   state: { user: 'nobody', calls: [] as string[][] },
 *   layout: {
 *     kind: 'stack',
 *     children: [
 *       { kind: 'field', label: 'user', value: ref('user') },
 *       { kind: 'table', columns: ['method', 'url'], rows: ref('calls') },
 *       { kind: 'button', label: 'Sign out', action: 'signOut', tone: 'error' },
 *     ],
 *   },
 * });
 *
 * session.setState({ user: 'ada@example.com' });
 * session.onAction('signOut', () => auth.signOut());
 * ```
 *
 * `send`, `onMessage`, `request`, `handle`, `expose` and `remote` are underneath for anything the
 * tab vocabulary does not cover.
 */
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

export { sliceOf };
