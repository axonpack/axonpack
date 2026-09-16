import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { counter, escaping, gallery, toggleBusy } from "./devtools";

/**
 * A playground for the tab, not a demo of an app.
 *
 * Three tabs are registered at import. This screen only shows what comes back from them, because
 * that is the half you cannot see in DevTools.
 */
export default function App() {
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const note = (line: string) =>
      setLog((lines) =>
        [`${new Date().toLocaleTimeString()}  ${line}`, ...lines].slice(0, 40),
      );

    const stops = [
      gallery.onAction("plain", () => note("gallery: plain")),
      gallery.onAction("destructive", () => note("gallery: destructive")),
      gallery.onAction("typed", (payload) =>
        note(`gallery: typed "${String(payload)}"`),
      ),
      counter.onAction("toggle", () => {
        toggleBusy();
        note("counter: toggled busy");
      }),
      escaping.onAction("never", () => note("unreachable")),
    ];

    return () => stops.forEach((stop) => stop());
  }, []);

  return (
    <View style={styles.screen}>
      <StatusBar style="auto" />
      <Text style={styles.title}>react-native-devtools-tab</Text>
      <Text style={styles.hint}>
        Open React Native DevTools. Three tabs are registered: Gallery, Counter
        and Escaping. Only Gallery and Counter redraw, once a second. Escaping
        reads no slice that changes, so it should sit perfectly still.
      </Text>

      <Text style={styles.heading}>What the tabs sent back</Text>
      <ScrollView style={styles.log} contentContainerStyle={styles.logContent}>
        {log.length === 0 ? (
          <Text style={styles.empty}>
            Nothing yet. Press something in a tab.
          </Text>
        ) : (
          log.map((line, index) => (
            <Text key={`${line}-${index}`} style={styles.line}>
              {line}
            </Text>
          ))
        )}
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
  heading: { color: "#f2f4f8", fontSize: 14, fontWeight: "600", marginTop: 4 },
  log: { flex: 1, borderRadius: 8, backgroundColor: "#181b23" },
  logContent: { padding: 12, gap: 6 },
  empty: { color: "#6b7488", fontSize: 13 },
  line: { color: "#c8cfdd", fontSize: 12, fontFamily: "Courier" },
});
