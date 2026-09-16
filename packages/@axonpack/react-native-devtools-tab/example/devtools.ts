import { ReactNativeDevtoolsPanel } from "@axonpack/react-native-devtools-tab";

import Counter from "./tabs/Counter";
import Escaping from "./tabs/Escaping";
import Shell from "./tabs/Shell";

/** A tab per thing worth checking. Each one is a component and nothing else. */

ReactNativeDevtoolsPanel.registerTab({
  id: "counter",
  name: "Counter",
  icon: "◴",
  component: Counter,
});

ReactNativeDevtoolsPanel.registerTab({
  id: "shell",
  name: "Shell",
  icon: "⌥",
  component: Shell,
});

ReactNativeDevtoolsPanel.registerTab({
  id: "escaping",
  name: "Escaping",
  icon: "⚑",
  component: Escaping,
});
