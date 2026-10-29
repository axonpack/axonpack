import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import type { BuildApp } from "../../services/native/build-info.service";
import type {
  Compatibility,
  IndexEntry,
  Platform,
} from "../../utils/previews/layout.util";
import { shortKey } from "../../utils/previews/layout.util";
import { KIND_TONE } from "../../constants/preview-list/chip-tones.const";
import {
  type Running,
  bundleKind,
  displayHostPort,
  runningKind,
  runningLabel,
} from "../../utils/previews/running.util";
import { font } from "../../utils/preview-list/theme.util";
import { Button } from "./ui/button.ui";
import { Chevron } from "./ui/chevron.ui";
import { Chip, EnvironmentChip, ServerChip } from "./ui/chip.ui";
import { ChipRow } from "./ui/chip-row.ui";
import { DetailRow } from "./ui/detail-row.ui";
import { IconButton } from "./ui/icon-button.ui";
import { RefreshIcon } from "./ui/refresh-icon.ui";
import { TitleSubtitle } from "./ui/title-subtitle.ui";
import type { PreviewListLabels, PreviewListTheme } from "./preview-list.types";

export type HeroBuild = {
  app: BuildApp;
  platform: Platform | null;
  compatibility: Compatibility | null;
  key: string | null;
};

type Row = [label: string, value: string | null | undefined];

/**
 * What runs now and where it comes from, then the facts QA needs for a bug report (the rest of
 * them, the app's own included, behind Show details), then the way back. Each fact shows once.
 */
export function HeroCard(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  running: Running;
  build: HeroBuild;
  /** The running preview's entry, when a preview runs and the list has it. */
  entry: IndexEntry | null;
  loading: boolean;
  /** A preview is chosen, even one that could not load. */
  canGoBack: boolean;
  /** Back to the default bundle: clears the chosen preview and the picked server. */
  onBackToDefault: () => void;
  onRefresh: () => void;
}) {
  const { theme, labels, running, build, entry } = props;
  const [expanded, setExpanded] = useState(false);
  const server = running.kind === "preview" ? null : running.server;
  const app = build.app;

  const kind = runningKind(running, labels);
  // A preview or a server has a name of its own; the bundle built into the app is named by its kind.
  // Metro only knows the app's name, so the Metro the app starts on, when `preview start` gave it
  // no title, is called by its role.
  const name =
    running.kind === "preview"
      ? running.title
      : running.kind === "default" && running.source === "expo-dev-server"
        ? labels.defaultServerTitle
        : (server?.title ?? kind);
  // A preview has no address; its branch and id wait behind Show details.
  const where =
    running.kind !== "preview" && running.hostPort
      ? displayHostPort(running.hostPort)
      : null;
  const version = app.version
    ? `${app.version}${app.buildNumber ? ` (${app.buildNumber})` : ""}`
    : null;

  const rows: Row[] = [
    [labels.author, entry?.author],
    [
      labels.published,
      entry?.publishedAt ? new Date(entry.publishedAt).toLocaleString() : null,
    ],
  ];
  const details: Row[] = [
    [
      labels.branch,
      running.kind === "preview" ? entry?.branch : server?.branch,
    ],
    [labels.previewId, running.kind === "preview" ? running.id : null],
    [labels.environment, entry?.environment],
    [labels.app, app.name],
    [labels.version, version],
    [labels.commit, entry?.commit?.slice(0, 7)],
    [
      labels.platform,
      build.platform === "ios"
        ? "iOS"
        : build.platform === "android"
          ? "Android"
          : null,
    ],
    [
      labels.compatibility,
      build.compatibility === "fingerprint"
        ? labels.compatibilityFingerprint
        : build.compatibility === "appVersion"
          ? labels.compatibilityAppVersion
          : null,
    ],
    [labels.compatibilityKey, build.key && shortKey(build.key)],
  ];
  const shown = (list: Row[]) =>
    list
      .filter((row): row is [string, string] => Boolean(row[1]))
      .map(([label, value]) => (
        <DetailRow key={label} theme={theme} label={label} value={value} />
      ));
  const visibleRows = shown(rows);
  const detailRows = shown(details);
  const isDefault = running.kind === "default";
  const kindKey = bundleKind(running);
  const chips = [
    // The headline already says the kind when there is no other name.
    name === kind ? null : kindKey === "preview" || kindKey === "built-in" ? (
      <Chip key="kind" theme={theme} text={kind} tone={KIND_TONE[kindKey]} />
    ) : (
      <ServerChip key="kind" theme={theme} labels={labels} kind={kindKey} />
    ),
    isDefault ? (
      <Chip key="default" theme={theme} text={labels.defaultBundle} />
    ) : null,
    entry?.environment ? (
      <EnvironmentChip
        key="env"
        theme={theme}
        labels={labels}
        name={entry.environment}
      />
    ) : null,
  ].filter(Boolean);
  const hairline = { borderTopWidth: 1, borderColor: theme.border };
  const hasActions = props.canGoBack || running.kind === "local";
  const showNote = __DEV__ && running.kind === "preview";
  const factRows = expanded ? [...visibleRows, ...detailRows] : visibleRows;
  const hasToggle = detailRows.length > 0;
  const endsCard = !showNote && !hasActions;
  // The toggle is 44 high for the finger but its text is 20. Alone, or as the card's last line, its
  // empty lower half only adds to the card's gap or padding, so it is pulled into them. Under rows
  // it keeps the room it has always had.
  const overhang = hasToggle && (factRows.length === 0 || endsCard) ? -12 : 0;

  return (
    <View
      style={{
        backgroundColor: theme.tint,
        borderRadius: theme.radius,
        borderWidth: 1,
        borderColor: theme.tintBorder,
        padding: 16,
        gap: 14,
      }}
    >
      <View style={{ gap: 10 }}>
        <View
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}
        >
          <View
            accessible
            accessibilityLabel={`${labels.running}: ${runningLabel(running, labels)}`}
            style={{ flex: 1, paddingTop: 2 }}
          >
            <TitleSubtitle
              theme={theme}
              title={name}
              subtitle={where}
              size="large"
            />
          </View>
          <IconButton
            theme={theme}
            label={labels.refresh}
            onPress={props.onRefresh}
            busy={props.loading}
          >
            {props.loading ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <RefreshIcon color={theme.text} />
            )}
          </IconButton>
        </View>
        {chips.length > 0 ? <ChipRow>{chips}</ChipRow> : null}
      </View>
      {factRows.length > 0 || hasToggle ? (
        <View
          testID="hero-facts"
          style={{
            ...hairline,
            // Room under the divider for rows; the toggle already has its own inside its 44.
            paddingTop: factRows.length > 0 ? 8 : 0,
            marginBottom: overhang,
          }}
        >
          {factRows}
          {hasToggle ? (
            <Pressable
              testID="hero-details-toggle"
              onPress={() => setExpanded(!expanded)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              style={{
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Text
                style={{ ...font(theme, "medium", 15), color: theme.primary }}
              >
                {expanded ? labels.hideDetails : labels.showDetails}
              </Text>
              <Chevron color={theme.primary} open={expanded} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {/* A dev preview server wins over a picked preview, so Metro is in use and the note would be wrong. */}
      {showNote ? (
        <Text style={{ ...font(theme, "regular", 14), color: theme.warning }}>
          {labels.metroBypassed}
        </Text>
      ) : null}
      {hasActions ? (
        <View
          testID="hero-actions"
          style={{
            ...hairline,
            paddingTop: 14,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <Button
            theme={theme}
            title={labels.backToDefault}
            onPress={props.onBackToDefault}
          />
        </View>
      ) : null}
    </View>
  );
}
