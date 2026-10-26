import {
  PreviewList,
  PreviewReadyProvider,
  previewTitle,
  previewsStore,
  type PreviewReadyConfig,
} from "@axonpack/preview-ready";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

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

// From .env (see .env.example). Expo builds EXPO_PUBLIC_* values into the app, so only a read-only
// key may go there, never the write key.
const url = process.env.EXPO_PUBLIC_PREVIEW_READY_S3_URL ?? "";
const config: PreviewReadyConfig = {
  enabled: true,
  url,
  readAccessKeyId: process.env.EXPO_PUBLIC_PREVIEW_READY_S3_READ_ACCESS_KEY_ID,
  readSecretAccessKey:
    process.env.EXPO_PUBLIC_PREVIEW_READY_S3_READ_SECRET_ACCESS_KEY,
  region: process.env.EXPO_PUBLIC_PREVIEW_READY_S3_REGION,
  publicUrl: process.env.EXPO_PUBLIC_PREVIEW_READY_S3_PUBLIC_URL,
};

export default function App() {
  // Links do what the list's buttons do, so a run can be scripted from a terminal:
  // previewreadyexample://download/<id>, .../switch/<id>, .../switch/embedded, .../refresh,
  // .../delete/<id>, .../deleteincompatible
  // (`xcrun simctl openurl booted <link>` or `adb shell am start -d <link>`).
  useEffect(() => {
    const sub = Linking.addEventListener("url", ({ url }) => {
      const [, action, id] =
        url.split("://")[1]?.match(/^([a-z]+)\/?(.*)$/) ?? [];
      if (action === "download" && id) previewsStore.download(config, id);
      if (action === "refresh") previewsStore.refresh(config);
      if (action === "delete" && id) previewsStore.remove(id);
      if (action === "deleteincompatible") previewsStore.removeIncompatible();
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
      {config.enabled ? (
        <PreviewList style={styles.list} />
      ) : (
        <Text style={styles.missing}>
          Set EXPO_PUBLIC_PREVIEW_READY_S3_URL in .env (copy .env.example), then
          rebuild the app.
        </Text>
      )}
      <StatusBar style="auto" />
    </PreviewReadyProvider>
  );
}

const styles = StyleSheet.create({
  banner: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 16 },
  bannerText: { fontSize: 20, fontWeight: "700" },
  list: { flex: 1 },
  missing: { padding: 16, fontSize: 15, color: "#b91c1c" },
});
