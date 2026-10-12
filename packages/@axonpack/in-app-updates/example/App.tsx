import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppUpdateSheet } from "./components/AppUpdateSheet";
import { PlayFake } from "./components/PlayFake";
import VersionCheck, {
  UpdatePrompt,
  getNativeUpdateInfo,
  isNativeUpdateSupported,
  setMockVersion,
  type NativeFakeScenario,
} from "@axonpack/in-app-updates";

// Open with a link to switch what the prompt shows, e.g. inappupdatesexample://?s=forced
// live (default): the real store answer, no mock    soft | forced | build | none | custom | native: mocked
const SCENARIOS = [
  "live",
  "soft",
  "expanded",
  "forced",
  "dark",
  "brand",
  "minimal",
  "build",
  "custom",
  "none",
  "native",
] as const;
type Scenario = (typeof SCENARIOS)[number];

const NOTES = "Soft update notes\n- one\n- two";

const MOCKS: Record<Exclude<Scenario, "live">, object> = {
  soft: { latestVersion: "9.0.0", releaseNotes: NOTES },
  expanded: { latestVersion: "9.0.0", releaseNotes: NOTES },
  forced: {
    latestVersion: "9.0.0",
    minimumVersion: "5.0.0",
    releaseNotes: "Forced update notes",
  },
  dark: { latestVersion: "9.0.0", releaseNotes: NOTES },
  brand: { latestVersion: "9.0.0", releaseNotes: NOTES },
  minimal: { latestVersion: "9.0.0" },
  // The same version, shipped again with a higher build number (Android versionCode).
  build: {
    latestVersion: VersionCheck.getCurrentVersion() ?? "1.0.0",
    buildNumber: 20,
  },
  custom: { latestVersion: "9.0.0", releaseNotes: NOTES },
  none: { latestVersion: VersionCheck.getCurrentVersion() ?? "1.0.0" },
  native: { latestVersion: "9.0.0" },
};

const serif = Platform.select({ ios: "Georgia", default: "serif" });
const BRAND = {
  primary: "#16a34a",
  primarySoft: "#e3f6e8",
  radius: 28,
  fonts: { regular: serif, medium: serif, bold: serif },
};

// A fixed scenario for screenshots: EXPO_PUBLIC_SCENARIO=forced EXPO_PUBLIC_SHOT=1 bun run start
const START =
  (process.env.EXPO_PUBLIC_SCENARIO as Scenario | undefined) ?? "live";
const SHOT = process.env.EXPO_PUBLIC_SHOT === "1";

export default function App() {
  const [rows, setRows] = useState<[string, string][]>([]);
  const [scenario, setScenario] = useState<Scenario>(START);
  const url = Linking.useLinkingURL();

  useEffect(() => {
    const s = url?.match(/[?&]s=([a-z]+)/)?.[1];
    if (s) setScenario(s as Scenario);
  }, [url]);

  // inappupdatesexample://?p=flexibleAccepted runs a fake Play scenario.
  const fake = url?.match(/[?&]p=([A-Za-z]+)/)?.[1] as
    NativeFakeScenario | undefined;

  const mock = scenario === "live" ? undefined : MOCKS[scenario];

  useEffect(() => {
    // Mocks only take effect in a __DEV__ build.
    setMockVersion(mock);
    return () => setMockVersion(undefined);
  }, [mock]);

  useEffect(() => {
    (async () => {
      const out: [string, string][] = [];
      const add = (k: string, v: unknown) =>
        out.push([k, typeof v === "string" ? v : JSON.stringify(v)]);
      add("platform", Platform.OS);
      add("package", VersionCheck.getPackageName());
      add("version", VersionCheck.getCurrentVersion());
      add("build", VersionCheck.getCurrentBuildNumber());
      add("country", await VersionCheck.getCountry());
      try {
        const r = await VersionCheck.needUpdate({
          ignoreErrors: false,
          forceUpdate: true,
          mock: {},
        });
        add("needUpdate", {
          isNeeded: r.isNeeded,
          latest: r.latestVersion,
          type: r.updateType,
          url: r.storeUrl,
          notes: !!r.releaseNotes,
        });
      } catch (e) {
        add("needUpdate error", String(e));
      }
      try {
        add(
          "getStoreUrl",
          await VersionCheck.getStoreUrl({ ignoreErrors: false }),
        );
      } catch (e) {
        add("getStoreUrl error", String(e));
      }
      add("native module", isNativeUpdateSupported());
      try {
        add("native info", await getNativeUpdateInfo());
      } catch (e) {
        add("native error", String(e));
      }
      setRows(out);
    })();
  }, []);

  const groups: [string, string[]][] = [
    ["App", ["platform", "package", "version", "build", "country"]],
    ["Store check", ["needUpdate", "getStoreUrl"]],
    ["Play in-app update", ["native module", "native info", "native error"]],
  ];
  const value = (k: string) => rows.find(([key]) => key === k)?.[1];

  return (
    <View
      style={[
        styles.root,
        SHOT && scenario === "dark" && { backgroundColor: "#0b1020" },
      ]}
    >
      {SHOT ? null : (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.title}>In-app updates</Text>
          <Text style={styles.subtitle}>__DEV__ = {String(__DEV__)}</Text>

          <View style={styles.chips}>
            {SCENARIOS.map((name) => (
              <Pressable
                key={name}
                onPress={() => setScenario(name)}
                style={[styles.chip, scenario === name && styles.chipActive]}
              >
                <Text
                  style={[
                    styles.chipText,
                    scenario === name && styles.chipTextActive,
                  ]}
                >
                  {name}
                </Text>
              </Pressable>
            ))}
          </View>

          <PlayFake autoRun={fake} />

          {groups.map(([title, keys]) => (
            <View key={title} style={styles.card}>
              <Text style={styles.cardTitle}>{title}</Text>
              {keys
                .filter((k) => value(k) !== undefined)
                .map((k) => (
                  <View key={k} style={styles.row}>
                    <Text style={styles.rowKey}>{k}</Text>
                    <Text style={styles.rowValue}>{value(k)}</Text>
                  </View>
                ))}
            </View>
          ))}
        </ScrollView>
      )}
      <UpdatePrompt
        key={scenario}
        mock={mock}
        component={scenario === "custom" ? AppUpdateSheet : undefined}
        theme={
          scenario === "dark"
            ? { mode: "dark" }
            : scenario === "brand"
              ? BRAND
              : undefined
        }
        notesExpanded={scenario === "expanded"}
        nativeUpdate={scenario === "native"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f4f6fa" },
  body: { padding: 20, paddingTop: 64, gap: 14 },
  title: { fontSize: 28, fontWeight: "800", color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#64748b", marginTop: -8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#e4e8f0",
  },
  chipActive: { backgroundColor: "#2563eb" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#334155" },
  chipTextActive: { color: "#fff" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 10 },
  cardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  rowKey: { fontSize: 14, color: "#475569" },
  rowValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    flexShrink: 1,
    textAlign: "right",
  },
  custom: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#fde68a",
  },
});
