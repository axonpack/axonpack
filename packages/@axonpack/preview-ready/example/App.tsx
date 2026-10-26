import { previewTitle, reload, selectPreview } from "@axonpack/preview-ready";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Set at bundle time, so each test preview looks different without editing this file:
// EXPO_PUBLIC_BUNDLE_LABEL=task-1-login-fix npx expo export:embed ...
const label = process.env.EXPO_PUBLIC_BUNDLE_LABEL ?? "embedded-bundle";

type Look = {
  background: string;
  card: string;
  text: string;
  accent: string;
  radius: number;
  note: string;
};

// One look per bundle, so it is obvious at a glance which one is running.
const LOOKS: Record<string, Look> = {
  "embedded-bundle": {
    background: "#ffffff",
    card: "#f2f2f2",
    text: "#111111",
    accent: "#2563eb",
    radius: 8,
    note: "The bundle inside the app",
  },
  "task-1-login-fix": {
    background: "#1e3a8a",
    card: "#1d4ed8",
    text: "#ffffff",
    accent: "#facc15",
    radius: 24,
    note: "Preview: the login screen fix",
  },
  "task-2-new-checkout": {
    background: "#064e3b",
    card: "#047857",
    text: "#ecfdf5",
    accent: "#f472b6",
    radius: 0,
    note: "Preview: the new checkout",
  },
};

const CHOICES: { title: string; id: string | null }[] = [
  { title: "Embedded", id: null },
  { title: "Task 1", id: "task-1-login-fix" },
  { title: "Task 2", id: "task-2-new-checkout" },
];

const look = LOOKS[label] ?? LOOKS["embedded-bundle"];

const switchTo = (id: string | null) => {
  selectPreview(id);
  reload();
};

// TODO(@axonpack/preview-ready): the preview list replaces these buttons once the package has one.
export default function App() {
  // Links do what the buttons do, so a switch can be scripted from a terminal:
  // previewreadyexample://switch/task-1-login-fix, .../switch/embedded, .../reload
  // (`xcrun simctl openurl booted <link>` or `adb shell am start -d <link>`).
  useEffect(() => {
    const sub = Linking.addEventListener("url", ({ url }) => {
      const [, action, id] =
        url.split("://")[1]?.match(/^([a-z]+)\/?(.*)$/) ?? [];
      if (action === "reload") reload();
      if (action === "switch") switchTo(id === "embedded" ? null : id);
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: look.background }]}>
      <View
        style={[
          styles.card,
          { backgroundColor: look.card, borderRadius: look.radius },
        ]}
      >
        <Text
          testID="bundle-label"
          style={[styles.title, { color: look.text }]}
        >
          {previewTitle(label)}
        </Text>
        <Text style={[styles.note, { color: look.text }]}>{look.note}</Text>
        <Image source={require("./assets/icon.png")} style={styles.icon} />
      </View>
      <View style={styles.row}>
        {CHOICES.map((choice) => (
          <Pressable
            key={choice.title}
            onPress={() => switchTo(choice.id)}
            style={[
              styles.button,
              { backgroundColor: look.accent, borderRadius: look.radius / 2 },
            ]}
          >
            <Text style={styles.buttonText}>{choice.title}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => reload()}>
        <Text style={[styles.reload, { color: look.text }]}>Reload</Text>
      </Pressable>
      <StatusBar style={look.text === "#111111" ? "dark" : "light"} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    padding: 24,
  },
  card: { alignItems: "center", gap: 8, padding: 24, alignSelf: "stretch" },
  title: { fontSize: 24, fontWeight: "700" },
  note: { fontSize: 15 },
  icon: { width: 96, height: 96, marginTop: 8 },
  row: { flexDirection: "row", gap: 12 },
  button: { paddingVertical: 12, paddingHorizontal: 16, minHeight: 44 },
  buttonText: { color: "#111111", fontWeight: "600" },
  reload: { fontSize: 15, textDecorationLine: "underline", padding: 12 },
});
