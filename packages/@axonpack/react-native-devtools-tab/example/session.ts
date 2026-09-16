import { ReactNativeDevtoolsPanel } from "@axonpack/react-native-devtools-tab";

/** One value the app's screen and the Session tab both read and both write. */
export const session = ReactNativeDevtoolsPanel.state({
  user: "nobody",
  requests: 0,
});

export function countRequest(): void {
  session.set((current) => ({ ...current, requests: current.requests + 1 }));
}
