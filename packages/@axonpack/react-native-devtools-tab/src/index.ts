import { createElement, type ComponentType } from "react";

import {
  DEVTOOLS_FOCUS,
  DEVTOOLS_ID,
  DEVTOOLS_TABS,
} from "./core/constants/devtools.const";
import {
  ACTION,
  FOCUS,
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
import { createTabChannel } from "./core/services/tab-channel.service";
import { TabFrame } from "./device/components/tab-frame.component";
import { connectFuseboxTransport } from "./device/services/fusebox-transport.service";
import {
  createRemoteSender,
  type RemoteSender,
} from "./device/services/remote-sender.service";

const channel = createMessageChannel();

void connectFuseboxTransport(DEVTOOLS_ID).then((transport) => {
  if (transport) channel.attach(transport);
});

/** Read by the frontend on connect, so a panel is built without the app being asked. */
const tabs: (TabRegistration & { id: string })[] = [];
(globalThis as Record<string, unknown>)[DEVTOOLS_TABS] = tabs;

const taken = new Set<string>();

/**
 * A tab names itself, from the name it already has.
 *
 * Nobody writes one, so nobody can collide with another package's tab or repeat their own. It is
 * derived rather than random because it is also the DevTools panel's own id: the frontend keeps a
 * panel per id, so a fresh one on every reload would leave the dead tab in the strip beside the new
 * one. Derived, a reload lands on the tab that is already open.
 */
function idFor(name: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "tab";

  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  taken.add(id);

  return id;
}

export { COPY_ATTRIBUTE } from "./core/constants/devtools.const";

export type TabOptions = {
  /** The label in the DevTools tab strip, and what the tab's id is built from. */
  name: string;
  /**
   * A symbol shown after the tab's name. Defaults to the Axonpack mark.
   *
   * Text rather than an image: React Native DevTools' own icon slots take an element, and every way
   * of putting one there loses its drawing. Any character works, so an emoji does too.
   */
  icon?: string;
  /**
   * What the tab draws, under the bar this package puts above it.
   *
   * Ordinary React: hooks, effects, context, any component it composes. It runs **in the app**, not
   * in the panel, against a renderer that reports what it drew instead of touching a DOM, and the
   * panel builds the real elements from that. So `useState` redraws the tab, and a handler runs
   * here, where the app's own state already is.
   *
   * The JSX can be `div` and `button`, because the elements are made at the other end, in a browser.
   * It can equally be `View`, `Text` and `Pressable`: those reach the panel as the host elements
   * React Native compiled them to, and the panel draws them with react-native-web. Layout, text and
   * presses cross. What does not is behaviour that lives in native code rather than in the
   * JavaScript, so `SafeAreaView` lays out with no insets and native `Animated` does not move.
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
  registerTab: (options: TabOptions) => RegisteredTab;
};

export type RegisteredTab = {
  /**
   * Shows this tab in React Native DevTools: now, in a window that is already open, and in the next
   * window that connects. Call it just before opening DevTools from the app, for example with
   * `DevSettings`' `openDebugger`, so the window lands here instead of on Console.
   */
  focus: () => void;
};

function registerTab(options: TabOptions): RegisteredTab {
  const id = idFor(options.name);
  const tab = createTabChannel(channel, id);
  let sender: RemoteSender | null = null;

  const registration: TabRegistration = {
    name: options.name,
    icon: options.icon,
  };
  tabs.push({ id, ...registration });

  // Still pushed, for a tab registered while somebody already has DevTools open. The frontend reads
  // the list when it connects, so this is the only case it cannot cover. It is also how a page that
  // is already open learns the app restarted, which is why nothing answers HELLO with it: a page
  // asks again when one arrives, and the two would go round forever.
  tab.send(REGISTER, registration);

  // A panel opened after the app started has missed the registration, so it asks rather than
  // waiting. Asking is also what makes reloading either side recover.
  tab.onMessage(HELLO, () => {
    if (sender) {
      // Already drawn once, for a panel that has since gone. Replaying what it holds is what keeps
      // the component's own state through a panel reload: it is never re-mounted.
      tab.send(MUTATE, { ops: sender.replay() } satisfies TabMutation);
      return;
    }

    // First look at this tab, so nothing has been rendered for it. Mounting only now is what keeps
    // a release build free: there is no panel to ask, so a component never runs, its effects never
    // start, and nothing it does costs anything.
    sender = createRemoteSender((ops) =>
      tab.send(MUTATE, { ops } satisfies TabMutation),
    );
    sender.render(
      createElement(TabFrame, {
        name: options.name,
        component: options.component,
      }),
    );
  });

  // A handler is named by where it sits in the tree rather than by a name somebody chose, so it
  // needs no registering and two tabs cannot collide.
  tab.onMessage(ACTION, (payload) => {
    const event = payload as TabAction;
    sender?.dispatch(event.action, event.payload);
  });

  return {
    focus: () => {
      (globalThis as Record<string, unknown>)[DEVTOOLS_FOCUS] = id;
      tab.send(FOCUS);
    },
  };
}

export const ReactNativeDevtoolsPanel: ReactNativeDevtoolsPanel = {
  registerTab,
};
