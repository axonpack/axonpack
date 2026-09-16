import { DEVTOOLS_ID } from "./core/constants/devtools.const";
import { ACTION, HELLO, REGISTER, STATE } from "./core/constants/message.const";
import type {
  TabAction,
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

export type {
  MessageChannel,
  MessageListener,
} from "./core/services/message-channel.service";
export type { UiNode, UiTone, Ref } from "./core/constants/ui-node.const";
export { ref } from "./core/constants/ui-node.const";
export type { Remote, RemoteMethods } from "./core/services/remote.service";

const channel = createMessageChannel();
const registrations = new Map<string, TabRegistration>();

void connectFuseboxTransport(DEVTOOLS_ID).then((transport) => {
  if (transport) channel.attach(transport);
});

// A panel opened after the app started has missed every registration, so it asks rather than
// waiting. Answering with everything held is also what makes reloading the panel recover.
channel.onMessage(HELLO, () => {
  for (const registration of registrations.values())
    channel.send(REGISTER, registration);
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
   * Use it when the vocabulary is not enough: build a page however you like, serve it from anywhere
   * the browser can reach, and talk to the app from it with `createPanelChannel` out of
   * `@axonpack/react-native-devtools-tab/panel`. `setState` and `onAction` still work; the page
   * receives the same messages, and it is up to the page what to do with them.
   *
   * A React component cannot be passed here. The app and the panel are separate JavaScript engines
   * and only data crosses between them, so a page has to be something the browser can load.
   */
  url?: string;
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
export type DevTools = MessageChannel & {
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
    state,
  };
  registrations.set(options.id, registration);
  channel.send(REGISTER, registration);

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
 * import { DevTools, ref } from '@axonpack/react-native-devtools-tab';
 *
 * const session = DevTools.registerTab({
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
export const DevTools: DevTools = {
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
