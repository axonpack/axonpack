import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import type { PreviewStatusInfo } from "../../services/previews/use-preview-status.service";
import { shortKey } from "../../utils/previews/layout.util";
import { KIND_TONE } from "../../constants/preview-list/chip-tones.const";
import { kindLabel } from "../../utils/previews/running.util";
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

type Row = [label: string, value: string | null | undefined];

/**
 * What runs now and where it comes from, then the facts QA needs for a bug report (the rest of
 * them, the app's own included, behind Show details), then the way back. Each fact shows once.
 */
export function HeroCard(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  /** From `usePreviewStatus`, given the same labels. */
  status: PreviewStatusInfo;
  onBackToDefault: () => void;
  onRefresh: () => void;
}) {
  const { theme, labels, status } = props;
  const [expanded, setExpanded] = useState(false);
  const { app, compatibility } = status;

  const kindKey = status.bundleKind;
  const kind = kindLabel(kindKey, labels);
  const name = status.title;
  // A preview has no address; its branch and id wait behind Show details.
  const where = status.address;
  const version = app.version
    ? `${app.version}${app.buildNumber ? ` (${app.buildNumber})` : ""}`
    : null;

  const rows: Row[] = [
    [labels.author, status.author],
    [
      labels.published,
      status.publishedAt ? new Date(status.publishedAt).toLocaleString() : null,
    ],
  ];
  const details: Row[] = [
    [labels.branch, status.branch],
    [labels.previewId, status.id],
    [labels.environment, status.environment],
    [labels.app, app.name],
    [labels.version, version],
    [labels.commit, status.commit?.slice(0, 7)],
    [
      labels.platform,
      app.platform === "ios"
        ? "iOS"
        : app.platform === "android"
          ? "Android"
          : null,
    ],
    [
      labels.compatibility,
      compatibility.mode === "fingerprint"
        ? labels.compatibilityFingerprint
        : compatibility.mode === "appVersion"
          ? labels.compatibilityAppVersion
          : null,
    ],
    [labels.compatibilityKey, compatibility.key && shortKey(compatibility.key)],
  ];
  const shown = (list: Row[]) =>
    list
      .filter((row): row is [string, string] => Boolean(row[1]))
      .map(([label, value]) => (
        <DetailRow key={label} theme={theme} label={label} value={value} />
      ));
  const visibleRows = shown(rows);
  const detailRows = shown(details);
  const chips = [
    // The headline already says the kind when there is no other name.
    name === kind ? null : kindKey === "preview" || kindKey === "built-in" ? (
      <Chip key="kind" theme={theme} text={kind} tone={KIND_TONE[kindKey]} />
    ) : (
      <ServerChip key="kind" theme={theme} labels={labels} kind={kindKey} />
    ),
    status.isDefault ? (
      <Chip key="default" theme={theme} text={labels.defaultBundle} />
    ) : null,
    status.environment ? (
      <EnvironmentChip
        key="env"
        theme={theme}
        labels={labels}
        name={status.environment}
      />
    ) : null,
  ].filter(Boolean);
  const hairline = { borderTopWidth: 1, borderColor: theme.border };
  const hasActions = status.canGoBack;
  const showNote = __DEV__ && status.kind === "preview";
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
            accessibilityLabel={`${labels.running}: ${status.label}`}
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
            busy={status.loading}
          >
            {status.loading ? (
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
