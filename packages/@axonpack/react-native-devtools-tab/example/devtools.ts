import { ReactNativeDevtoolsPanel } from "@axonpack/react-native-devtools-tab";

import Session from "./tabs/Session";
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
