import { ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import "./devtools";

/**
 * A playground for the tab, not a demo of an app.
 *
 * Three tabs are registered at import, and each is a React component that runs in this app. There is
 * nothing for this screen to show about them, because their state is their own.
 */
export default function App() {
  return (
    <View style={styles.screen}>
      <StatusBar style="auto" />
      <Text style={styles.title}>react-native-devtools-tab</Text>
      <Text style={styles.hint}>
        Open React Native DevTools. Three tabs are registered: Counter, Shell
        and Escaping. Each one is a component passed straight to registerTab,
        rendered by React here in the app and drawn by the panel.
      </Text>

      <ScrollView style={styles.log} contentContainerStyle={styles.logContent}>
        <Text style={styles.line}>Counter ticks on its own useState.</Text>
        <Text style={styles.line}>
          Shell runs a command on the machine Metro is on.
        </Text>
        <Text style={styles.line}>
          Escaping renders a string that looks like markup.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#12141a",
    paddingTop: 64,
    paddingHorizontal: 20,
    gap: 12,
  },
  title: { color: "#f2f4f8", fontSize: 18, fontWeight: "600" },
  hint: { color: "#8b93a5", fontSize: 13, lineHeight: 18 },
  log: { flex: 1, borderRadius: 8, backgroundColor: "#181b23" },
  logContent: { padding: 12, gap: 6 },
  line: { color: "#c8cfdd", fontSize: 12, fontFamily: "Courier" },
});
