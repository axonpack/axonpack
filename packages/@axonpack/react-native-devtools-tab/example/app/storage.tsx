import { useReducer } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { MMKV_UNAVAILABLE, mmkv, readAll } from "../storage";

/**
 * The app's half of the MMKV demo.
 *
 * Write here, then look at the Storage tab: it calls the same instance, so it sees this the moment
 * it redraws. Nothing tells it; there is nothing to tell.
 */
export default function StorageScreen() {
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const store = mmkv;

  if (!store)
    return (
      <View style={styles.screen}>
        <Text style={styles.hint}>{MMKV_UNAVAILABLE}</Text>
      </View>
    );

  const rows = readAll();

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.hint}>
        {rows.length} keys. The Storage tab in DevTools is reading this same
        instance, synchronously, because it runs here.
      </Text>

      {rows.map((row) => (
        <Text key={row.key} style={styles.line}>
          {row.key} = {row.value} ({row.kind})
        </Text>
      ))}

      <Pressable
        style={styles.button}
        onPress={() => {
          store.set("opened", new Date().toISOString());
          store.set("user.id", (store.getNumber("user.id") ?? 0) + 1);
          refresh();
        }}
      >
        <Text style={styles.buttonText}>Write a key, watch the tab</Text>
      </Pressable>

      <Pressable
        style={styles.button}
        onPress={() => {
          store.clearAll();
          refresh();
        }}
      >
        <Text style={styles.buttonText}>Clear all</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, gap: 10 },
  hint: { color: "#8b93a5", fontSize: 13, lineHeight: 18 },
  line: { color: "#c8cfdd", fontSize: 12, fontFamily: "Courier" },
  button: { backgroundColor: "#2b3040", borderRadius: 8, padding: 12 },
  buttonText: { color: "#f2f4f8", fontSize: 13, textAlign: "center" },
});
