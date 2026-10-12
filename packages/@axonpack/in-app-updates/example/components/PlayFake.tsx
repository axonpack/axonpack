import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  INSTALL_STATUS_DOWNLOADED,
  completeNativeUpdate,
  getNativeUpdateInfo,
  getNativeUpdateState,
  setNativeUpdateFake,
  startNativeUpdate,
  type NativeFakeScenario,
} from "@axonpack/in-app-updates";

const SCENARIOS: NativeFakeScenario[] = [
  "flexibleAccepted",
  "immediateAccepted",
  "declined",
  "failed",
  "unavailable",
  "inProgress",
  "downloadedOnLaunch",
];

const STATUS: Record<number, string> = {
  1: "PENDING",
  2: "DOWNLOADING",
  3: "INSTALLING",
  4: "INSTALLED",
  5: "FAILED",
  6: "CANCELED",
  11: "DOWNLOADED",
};

// Drives the fake Google Play, so the whole update flow runs without Play. It needs a debuggable
// Android build and __DEV__.
export function PlayFake({ autoRun }: { autoRun?: NativeFakeScenario }) {
  const [log, setLog] = useState<string[]>([]);

  const run = async (scenario: NativeFakeScenario) => {
    const add = (line: string) => setLog((lines) => [...lines, line]);
    setLog([`scenario: ${scenario}`]);
    try {
      await setNativeUpdateFake(scenario);
      const info = await getNativeUpdateInfo();
      add(
        `info: available=${info?.available} inProgress=${info?.inProgress} installStatus=${info?.installStatus}`,
      );
      const state = await getNativeUpdateState();
      add(`state: ${state}`);
      if (state === "downloaded") {
        add("install the downloaded update");
        await completeNativeUpdate();
        return;
      }
      const kind =
        state === "in-progress" || scenario === "immediateAccepted"
          ? "immediate"
          : "flexible";
      const outcome = await startNativeUpdate(kind, (s) => {
        add(
          `status ${STATUS[s.status] ?? s.status} ${Math.round(s.bytesDownloaded / 1e6)}/${Math.round(s.totalBytesToDownload / 1e6)} MB`,
        );
        if (s.status === INSTALL_STATUS_DOWNLOADED && kind === "flexible") {
          add("downloaded, so install it");
          void completeNativeUpdate();
        }
      });
      add(`outcome: ${outcome}`);
    } catch (error) {
      add(`error: ${String(error)}`);
    }
  };

  useEffect(() => {
    if (autoRun) void run(autoRun);
  }, [autoRun]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Play fake (debug builds)</Text>
      <View style={styles.chips}>
        {SCENARIOS.map((name) => (
          <Pressable
            key={name}
            onPress={() => void run(name)}
            style={styles.chip}
          >
            <Text style={styles.chipText}>{name}</Text>
          </Pressable>
        ))}
      </View>
      {log.map((line, i) => (
        <Text key={i} style={styles.line}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 8 },
  title: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e4e8f0",
  },
  chipText: { fontSize: 12, fontWeight: "600", color: "#334155" },
  line: { fontSize: 12, color: "#0f172a", fontFamily: "monospace" },
});
