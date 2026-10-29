import { usePreviewStatus } from "@axonpack/preview";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LOOKS = {
  default: { background: "#e2e8f0", text: "#0f172a" },
  preview: { background: "#1d4ed8", text: "#ffffff" },
  local: { background: "#047857", text: "#ecfdf5" },
};

/** What this start runs, on every tab, so a switch is obvious. */
export function BundleBanner() {
  const { top } = useSafeAreaInsets();
  // What the list's header card reads, so the banner and the list never disagree.
  const status = usePreviewStatus();
  const look = LOOKS[status.kind];
  const detail = status.id ?? status.branch;
  return (
    <View
      style={[
        styles.banner,
        { paddingTop: top + 8, backgroundColor: look.background },
      ]}
    >
      <Text testID="bundle-label" style={[styles.title, { color: look.text }]}>
        {status.label}
      </Text>
      {detail ? (
        <Text style={[styles.detail, { color: look.text }]}>{detail}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { paddingBottom: 12, paddingHorizontal: 16 },
  title: { fontSize: 16, fontWeight: "700" },
  detail: { fontSize: 13, marginTop: 2 },
});
