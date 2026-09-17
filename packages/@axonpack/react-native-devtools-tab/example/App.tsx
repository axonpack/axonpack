import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import "./devtools";
import { countRequest, session } from "./session";

/**
 * A playground for the tab, not a demo of an app.
 *
 * Press here and watch the Session tab: a tab is a component rendered by the app's own React, so it
 * subscribes to the same value the screen does and re-renders with it.
 */
export default function App() {
  // The same hook the Session tab calls, on the same value.
  const { user, requests } = session.use();

  return (
    <View style={styles.screen}>
      <StatusBar style="auto" />
      <Text style={styles.title}>react-native-devtools-tab</Text>
      <Text style={styles.hint}>
        Open React Native DevTools. Three tabs are registered: Session, Shell
        and Escaping. Each is a React component passed straight to registerTab,
        rendered here in the app and drawn by the panel.
      </Text>

      <Text style={styles.line}>
        user {user} — requests {requests}
      </Text>

      <Pressable style={styles.button} onPress={countRequest}>
        <Text style={styles.buttonText}>
          Count a request, and watch the Session tab follow
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#12141a",
    paddingTop: 64,
    paddingHorizontal: 20,
    gap: 16,
  },
  title: { color: "#f2f4f8", fontSize: 18, fontWeight: "600" },
  hint: { color: "#8b93a5", fontSize: 13, lineHeight: 18 },
  button: { backgroundColor: "#2b3040", borderRadius: 8, padding: 12 },
  buttonText: { color: "#f2f4f8", fontSize: 13, textAlign: "center" },
  line: { color: "#c8cfdd", fontSize: 12, fontFamily: "Courier" },
});
