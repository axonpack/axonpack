import { createElement as h, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import type { BuildApp } from "../../services/native/build-info.service";
import type {
  Compatibility,
  IndexEntry,
  Platform,
} from "../../utils/previews/layout.util";
import { shortKey } from "../../utils/previews/layout.util";
import {
  type Running,
  displayHostPort,
  runningKind,
  runningLabel,
} from "../../utils/previews/running.util";
import { font } from "../../utils/preview-list/theme.util";
import { Button } from "./ui/button.ui";
import { Chip } from "./ui/chip.ui";
import { DetailRow } from "./ui/detail-row.ui";
import { IconButton } from "./ui/icon-button.ui";
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
  error: string | null;
  loading: boolean;
  /** A preview is chosen, so going back does more than Stop does. */
  canGoBack: boolean;
  onBackToBase: () => void;
  onStopServer: () => void;
  onRefresh: () => void;
}) {
  const { theme, labels, running, build, entry } = props;
  const [expanded, setExpanded] = useState(false);
  const server = running.kind === "preview" ? null : running.server;
  const app = build.app;

  const kind = runningKind(running, labels);
  // A preview or a server has a name of its own; the bundle built into the app is named by its kind.
  const name =
    running.kind === "preview" ? running.title : (server?.title ?? kind);
  const where =
    running.kind === "preview"
      ? entry?.branch || running.id
      : running.hostPort && displayHostPort(running.hostPort);
  const version = app.version
    ? `${app.version}${app.buildNumber ? ` (${app.buildNumber})` : ""}`
    : null;

  const rows: Row[] = [
    [labels.branch, server?.branch],
    [labels.author, entry?.author],
    [
      labels.published,
      entry?.publishedAt ? new Date(entry.publishedAt).toLocaleString() : null,
    ],
  ];
  const details: Row[] = [
    [
      labels.previewId,
      running.kind === "preview" && where !== running.id ? running.id : null,
    ],
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
      .map(([label, value]) =>
        h(DetailRow, { key: label, theme, label, value }),
      );
  const visibleRows = shown(rows);
  const detailRows = shown(details);
  const isDefault = running.kind === "base";
  const chips = [
    // The headline already says the kind when there is no other name.
    name === kind
      ? null
      : h(Chip, {
          key: "kind",
          theme,
          text: kind,
          // Filled only when something was switched in, so the default reads as calm.
          tone: isDefault ? "neutral" : "primary",
        }),
    isDefault
      ? h(Chip, { key: "default", theme, text: labels.defaultBundle })
      : null,
    entry?.environment
      ? h(Chip, { key: "env", theme, text: entry.environment, tone: "success" })
      : null,
  ].filter(Boolean);
  const hairline = { borderTopWidth: 1, borderColor: theme.border };

  return h(
    View,
    {
      style: {
        backgroundColor: theme.tint,
        borderRadius: theme.radius,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 16,
        gap: 14,
      },
    },
    h(
      View,
      { style: { gap: 10 } },
      h(
        View,
        { style: { flexDirection: "row", alignItems: "flex-start", gap: 12 } },
        h(
          View,
          {
            accessible: true,
            accessibilityLabel: `${labels.running}: ${runningLabel(running, labels)}`,
            style: { flex: 1, paddingTop: 2 },
          },
          h(TitleSubtitle, {
            theme,
            title: name,
            subtitle: where,
            size: "large",
          }),
        ),
        h(
          IconButton,
          {
            theme,
            label: labels.refresh,
            onPress: props.onRefresh,
            busy: props.loading,
          },
          props.loading
            ? h(ActivityIndicator, { color: theme.primary })
            : h(
                Text,
                {
                  importantForAccessibility: "no",
                  style: { ...font(theme, "medium", 20), color: theme.text },
                },
                "\u21bb",
              ),
        ),
      ),
      chips.length > 0
        ? h(
            View,
            { style: { flexDirection: "row", flexWrap: "wrap", gap: 6 } },
            ...chips,
          )
        : null,
    ),
    h(
      View,
      { style: { ...hairline, paddingTop: 8 } },
      ...visibleRows,
      expanded ? detailRows : null,
      detailRows.length > 0
        ? h(
            Pressable,
            {
              onPress: () => setExpanded(!expanded),
              accessibilityRole: "button",
              accessibilityState: { expanded },
              style: { minHeight: 44, justifyContent: "center" },
            },
            h(
              Text,
              { style: { ...font(theme, "medium", 15), color: theme.primary } },
              expanded ? labels.hideDetails : labels.showDetails,
            ),
          )
        : null,
    ),
    // A dev preview server wins over a picked preview, so Metro is in use and the note would be wrong.
    __DEV__ && running.kind === "preview"
      ? h(
          Text,
          { style: { ...font(theme, "regular", 14), color: theme.warning } },
          labels.metroBypassed,
        )
      : null,
    props.error
      ? h(
          Text,
          { style: { ...font(theme, "regular", 14), color: theme.danger } },
          props.error,
        )
      : null,
    props.canGoBack || running.kind === "local"
      ? h(
          View,
          {
            style: {
              ...hairline,
              paddingTop: 14,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            },
          },
          props.canGoBack
            ? h(Button, {
                key: "back",
                theme,
                title: labels.backToBase,
                onPress: props.onBackToBase,
              })
            : null,
          running.kind === "local"
            ? h(Button, {
                key: "stop",
                theme,
                title: labels.stopServer,
                onPress: props.onStopServer,
                kind: "plain",
              })
            : null,
        )
      : null,
  );
}
