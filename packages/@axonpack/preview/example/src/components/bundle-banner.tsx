import { previewTitle } from "@axonpack/preview";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { bundleLabel } from "@/preview-config";

const LOOKS: Record<string, { background: string; text: string }> = {
  "embedded-bundle": { background: "#e2e8f0", text: "#0f172a" },
  "task-1-login-fix": { background: "#1d4ed8", text: "#ffffff" },
  "task-2-new-checkout": { background: "#047857", text: "#ecfdf5" },
};
const look = LOOKS[bundleLabel] ?? { background: "#7c3aed", text: "#ffffff" };

/** Which bundle is running, so a switch is obvious on every tab. */
export function BundleBanner() {
  const { top } = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.banner,
        { paddingTop: top + 8, backgroundColor: look.background },
      ]}
    >
      <Text testID="bundle-label" style={[styles.text, { color: look.text }]}>
        {previewTitle(bundleLabel)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { paddingBottom: 12, paddingHorizontal: 16 },
  text: { fontSize: 20, fontWeight: "700" },
});
