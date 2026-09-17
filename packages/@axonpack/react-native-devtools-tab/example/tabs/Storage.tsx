import { useReducer, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { MMKV_UNAVAILABLE, mmkv, readAll } from "../storage";

/**
 * The app's MMKV, read and written from the panel, drawn with React Native components.
 *
 * Two things at once. The store needs no bridge: this runs in the app, so `mmkv` is the instance
 * the screens use and `getString` is the same synchronous call it is anywhere else. And the UI is
 * `View` and `Text` rather than `div` and `span`, which reach the panel as the host elements React
 * Native compiled them to and are drawn there by react-native-web.
 */
export default function Storage() {
  // MMKV has no subscription this tab uses, so a write re-reads rather than waiting to be told.
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  // Bumped to remount the fields, which is how an uncontrolled input is cleared.
  const [round, clear] = useReducer((n: number) => n + 1, 0);

  // Narrowed into a local, because the closures below outlive the check on the import.
  const store = mmkv;
  if (!store)
    return (
      <View style={styles.screen}>
        <Text style={styles.muted}>{MMKV_UNAVAILABLE}</Text>
      </View>
    );

  const rows = readAll();

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.heading}>{rows.length} keys</Text>

      <View style={styles.table}>
        {rows.map((row) => (
          <View key={row.key} style={styles.row}>
            <Text style={styles.key}>{row.key}</Text>
            <Text style={styles.value}>{row.value}</Text>
            <Text style={styles.kind}>{row.kind}</Text>
            <Pressable
              style={styles.small}
              onPress={() => {
                // Version 4 renamed this from `delete`.
                store.remove(row.key);
                refresh();
              }}
            >
              <Text style={styles.smallText}>remove</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.form}>
        {/*
          `defaultValue`, not `value`. A controlled TextInput keeps the native view in step by
          sending it a command, and a tab has no native view to send one to: React Native warns
          about the ref and the keystroke throws. Uncontrolled, it never asks.
        */}
        <TextInput
          key={`key-${round}`}
          style={styles.input}
          defaultValue=""
          placeholder="key"
          placeholderTextColor="#6b7280"
          onChangeText={setKey}
        />
        <TextInput
          key={`value-${round}`}
          style={styles.input}
          defaultValue=""
          placeholder="value"
          placeholderTextColor="#6b7280"
          onChangeText={setValue}
        />
        <Pressable
          style={styles.button}
          onPress={() => {
            if (!key) return;
            store.set(key, value);
            setKey("");
            setValue("");
            clear();
            refresh();
          }}
        >
          <Text style={styles.buttonText}>set</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={refresh}>
          <Text style={styles.buttonText}>refresh</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 12, gap: 10 },
  heading: { fontSize: 13, fontWeight: "600" },
  muted: { opacity: 0.7 },
  table: { gap: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 3,
  },
  key: { width: 140, fontSize: 12 },
  value: { flex: 1, fontSize: 12 },
  kind: { width: 60, fontSize: 11, opacity: 0.6 },
  form: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  input: {
    minWidth: 120,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#3c3c3c",
    borderRadius: 4,
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: "#2b3040",
  },
  buttonText: { color: "#f2f4f8", fontSize: 12 },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: "#2b3040",
  },
  smallText: { color: "#f2f4f8", fontSize: 11 },
});
