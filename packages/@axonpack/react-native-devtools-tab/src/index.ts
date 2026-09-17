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
import { createMessageChannel } from "./core/services/message-channel.service";
import { connectFuseboxTransport } from "./device/services/fusebox-transport.service";
import {
  createRemoteSender,
  type RemoteSender,
} from "./device/services/remote-sender.service";

const channel = createMessageChannel();
const registrations = new Map<string, TabRegistration>();
const senders = new Map<string, RemoteSender>();
const mounts = new Map<string, () => void>();

void connectFuseboxTransport(DEVTOOLS_ID).then((transport) => {
  if (transport) channel.attach(transport);
});

// A panel opened after the app started has missed every registration, so it asks rather than
// waiting. Answering with everything held is also what makes reloading the panel recover.
channel.onMessage(HELLO, () => {
  for (const registration of registrations.values()) {
    channel.send(REGISTER, registration);

    const sender = senders.get(registration.id);

    if (sender) {
      // Already drawn once, for a panel that has since gone. Replaying what it holds is what
      // keeps a component's own state through a panel reload: it is never re-mounted.
      channel.send(MUTATE, {
        id: registration.id,
        ops: sender.replay(),
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
 * A tab reaches the app by being part of it. Reading its state and calling into it are ordinary
 * React, so there is nothing else on this object.
 */
export type ReactNativeDevtoolsPanel = {
  /** Adds a tab to React Native DevTools. Call it once per tab, as many times as you have tabs. */
  registerTab: (options: TabOptions) => Tab;
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
    let sender = senders.get(options.id);

    if (!sender) {
      sender = createRemoteSender((ops) =>
        channel.send(MUTATE, { id: options.id, ops } satisfies TabMutation),
      );
      senders.set(options.id, sender);
    }

    sender.render(createElement(options.component));
  };

  mounts.set(options.id, draw);

  // A handler is named by where it sits in the tree rather than by a name somebody chose, so it
  // needs no registering and two tabs cannot collide.
  channel.onMessage(ACTION, (payload) => {
    const event = payload as TabAction;
    if (event?.id === options.id)
      senders.get(options.id)?.dispatch(event.action, event.payload);
  });

  return {
    id: options.id,
    // Nothing to draw again until somebody has opened DevTools, which is the whole of the production
    // gate: no panel, no render, no effects.
    redraw: () => {
      if (senders.has(options.id)) draw();
    },
  };
}

export const ReactNativeDevtoolsPanel: ReactNativeDevtoolsPanel = {
  registerTab,
};
