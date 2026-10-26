import {
  PreviewList,
  PreviewReadyProvider,
  previewTitle,
  previewsStore,
  type PreviewReadyConfig,
} from "@axonpack/preview-ready";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";

// Set at bundle time so each test preview looks different without editing this file:
// EXPO_PUBLIC_BUNDLE_LABEL=task-1-login-fix npx preview-ready publish --id task-1-login-fix
const label = process.env.EXPO_PUBLIC_BUNDLE_LABEL ?? "embedded-bundle";

// Lets you try the crash fallback: a preview published with this label throws while it loads.
if (label === "crash-on-start") {
  throw new Error("This preview crashes on purpose");
}

const LOOKS: Record<string, { background: string; text: string }> = {
  "embedded-bundle": { background: "#e2e8f0", text: "#0f172a" },
  "task-1-login-fix": { background: "#1d4ed8", text: "#ffffff" },
  "task-2-new-checkout": { background: "#047857", text: "#ecfdf5" },
};
const look = LOOKS[label] ?? { background: "#7c3aed", text: "#ffffff" };

// The local MinIO from `bun run storage:local` in the package. The Android emulator reaches this
// computer at 10.0.2.2; on a phone, use the computer's LAN address instead.
const config: PreviewReadyConfig = {
  enabled: true,
  url: `http://${Platform.OS === "android" ? "10.0.2.2" : "localhost"}:9000/previews-public`,
};

export default function App() {
  // Links do what the list's buttons do, so a run can be scripted from a terminal:
  // previewreadyexample://download/<id>, .../switch/<id>, .../switch/embedded
  // (`xcrun simctl openurl booted <link>` or `adb shell am start -d <link>`).
  useEffect(() => {
    const sub = Linking.addEventListener("url", ({ url }) => {
      const [, action, id] =
        url.split("://")[1]?.match(/^([a-z]+)\/?(.*)$/) ?? [];
      if (action === "download" && id) previewsStore.download(config, id);
      if (action === "switch")
        previewsStore.switchTo(config, id === "embedded" ? null : id);
    });
    return () => sub.remove();
  }, []);

  return (
    <PreviewReadyProvider config={config}>
      <View style={[styles.banner, { backgroundColor: look.background }]}>
        <Text
          testID="bundle-label"
          style={[styles.bannerText, { color: look.text }]}
        >
          {previewTitle(label)}
        </Text>
      </View>
      <PreviewList style={styles.list} />
      <StatusBar style="auto" />
    </PreviewReadyProvider>
  );
}

const styles = StyleSheet.create({
  banner: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 16 },
  bannerText: { fontSize: 20, fontWeight: "700" },
  list: { flex: 1 },
});
