import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useZustandTest } from "./zustand-test";
import ZustandTest from "./tabs/ZustandTest";
import { useState } from "react";

/**
 * The app's half of the zustand test.
 *
 * The same store the Counter tab draws, read here the ordinary way. Pressing this changes nothing
 * the panel is told about; the tab is subscribed to the store itself, so it follows because it is
 * part of this app rather than because anything was sent.
 */
export default function ZustandScreen() {
  const { count, theme, items, increment, toggleTheme, addItem } =
    useZustandTest();
  const [state, setState] = useState("my state");

  return (
    <View style={styles.block}>
      <Text style={styles.line}>
        zustand count {count}, theme {theme}, items {items.length}
      </Text>

      <View style={styles.row}>
        <Pressable style={styles.button} onPress={increment}>
          <Text style={styles.buttonText}>Increment</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={toggleTheme}>
          <Text style={styles.buttonText}>Toggle theme</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={addItem}>
          <Text style={styles.buttonText}>Add an item</Text>
        </Pressable>
      </View>
      <Text style={styles.line}>{state}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setState((o) => "my new state -- " + o)}
      >
        <Text style={styles.buttonText}>Change state</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8 },
  row: { flexDirection: "row", gap: 8 },
  button: {
    backgroundColor: "#2b3040",
    borderRadius: 8,
    paddingVertical: 10,
  },
  buttonText: { color: "#f2f4f8", fontSize: 12, textAlign: "center" },
  line: { color: "#c8cfdd", fontSize: 12, fontFamily: "Courier" },
});
