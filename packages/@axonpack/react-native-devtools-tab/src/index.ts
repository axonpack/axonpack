import type { ComponentType } from "react";

import { DEVTOOLS_ID, DEVTOOLS_TABS } from "./core/constants/devtools.const";
import { REGISTER } from "./core/constants/message.const";
import type { TabRegistration } from "./core/constants/message.const";
import { createMessageChannel } from "./core/services/message-channel.service";
import { createTabChannel } from "./core/services/tab-channel.service";
import { connectFuseboxTransport } from "./device/services/fusebox-transport.service";
import { IN_PANEL, mountTab } from "./device/services/mount-tab.service";

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
   * Ordinary React Native. Metro builds the module this is registered in a second time, for the web,
   * the same way `expo start --web` does, so `react-native` there is react-native-web and `View`,
   * `Text`, `Pressable` and the rest are the real ones, running in a browser. Nothing is mapped or
   * translated on the way. `div` and `button` work in the same tree, because it is a web page.
   *
   * **It runs in the panel, not in the app.** That bundle is its own JavaScript world with its own
   * copy of every module, so a store imported here is a different instance from the app's and starts
   * empty. Nothing a tab does reaches the running app except as a message over the debugger
   * connection.
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
  registerTab: (options: TabOptions) => void;
};

function registerTab(options: TabOptions): void {
  const id = idFor(options.name);

  // The same module, built for the web and loaded by a tab's page. Ids come out the same because
  // they are derived from the names in the order they are registered, and this is the same file
  // registering them. So the tab the page asked for is the tab that mounts.
  if (IN_PANEL) {
    mountTab(id, options.name, options.component);
    return;
  }

  const registration: TabRegistration = {
    name: options.name,
    icon: options.icon,
  };
  tabs.push({ id, ...registration });

  // Announced as well as listed, for a tab registered while somebody already has DevTools open. The
  // frontend reads the list when it connects, so this is the only case that cannot cover.
  createTabChannel(channel, id).send(REGISTER, registration);
}

export const ReactNativeDevtoolsPanel: ReactNativeDevtoolsPanel = {
  registerTab,
};
