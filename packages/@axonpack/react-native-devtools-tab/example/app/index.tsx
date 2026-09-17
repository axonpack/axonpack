import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { countRequest, session } from "../session";
import ZustandScreen from "../ZustandScreen";

/**
 * A playground for the tab, not a demo of an app.
 *
 * Press here and watch the Counter tab: a tab is a component rendered by the app's own React, so it
 * subscribes to the same value this screen does and re-renders with it.
 */
export default function Home() {
  // The same hook the Counter tab calls, on the same value.
  const { user, requests } = session.use();

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.hint}>
        Open React Native DevTools. Every tab is a React component passed
        straight to registerTab, rendered here in the app and drawn by the
        panel, so it reads what this screen reads.
      </Text>

      <Text style={styles.line}>
        user {user} — requests {requests}
      </Text>

      <Pressable style={styles.button} onPress={countRequest}>
        <Text style={styles.buttonText}>
          Count a request, and watch the Counter tab follow
        </Text>
      </Pressable>

      <ZustandScreen />

      <View style={styles.links}>
        <Link href="/storage" style={styles.link}>
          MMKV, and the Storage tab beside it
        </Link>
        <Link href="/database" style={styles.link}>
          SQLite, and the Database tab beside it
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, gap: 16 },
  hint: { color: "#8b93a5", fontSize: 13, lineHeight: 18 },
  button: { backgroundColor: "#2b3040", borderRadius: 8, padding: 12 },
  buttonText: { color: "#f2f4f8", fontSize: 13, textAlign: "center" },
  line: { color: "#c8cfdd", fontSize: 12, fontFamily: "Courier" },
  links: { gap: 10, paddingTop: 4 },
  link: {
    color: "#7aa2f7",
    fontSize: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#2b3040",
  },
});
