import { ReactNativeDevtoolsPanel } from "@axonpack/react-native-devtools-tab";

import Session from "./tabs/Session";
import Storage from "./tabs/Storage";
import Database from "./tabs/Database";
import Escaping from "./tabs/Escaping";
import Shell from "./tabs/Shell";

/** A tab per thing worth checking. Each one is a component and nothing else. */

ReactNativeDevtoolsPanel.registerTab({
  name: "Counter",
  icon: "◴",
  component: Session,
});

ReactNativeDevtoolsPanel.registerTab({
  name: "Shell",
  icon: "⌥",
  component: Shell,
});

ReactNativeDevtoolsPanel.registerTab({
  name: "Escaping",
  icon: "⚑",
  component: Escaping,
});

/**
 * A tab reading the app's key-value store, and one querying its database.
 *
 * Neither is given anything. They import `../storage` and `../database` and call them, because a
 * tab's component runs in the app, where those live. MMKV is synchronous and stays synchronous;
 * SQLite runs against the real file on the device.
 */
ReactNativeDevtoolsPanel.registerTab({
  name: "Storage",
  icon: "▤",
  component: Storage,
});

ReactNativeDevtoolsPanel.registerTab({
  name: "Database",
  icon: "▦",
  component: Database,
});
