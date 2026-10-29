import { createElement as h } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import type { BuildApp } from "../../services/native/build-info.service";
import type {
  Compatibility,
  IndexEntry,
  Platform,
} from "../../utils/previews/layout.util";
import { shortKey } from "../../utils/previews/layout.util";
import {
  type Running,
  runningKind,
  runningLabel,
} from "../../utils/previews/running.util";
import { font } from "../../utils/preview-list/theme.util";
import { Button } from "./ui/button.ui";
import { Chip } from "./ui/chip.ui";
import { Fact } from "./ui/fact.ui";
import { TitleSubtitle } from "./ui/title-subtitle.ui";
import type { PreviewListLabels, PreviewListTheme } from "./preview-list.types";

export type HeroBuild = {
  app: BuildApp;
  platform: Platform | null;
  compatibility: Compatibility | null;
  key: string | null;
};

/** What runs now and the build it runs on, with the actions that change it. */
export function HeroCard(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  running: Running;
  build: HeroBuild;
  /** The running preview's entry, when a preview runs and the list has it. */
  entry: IndexEntry | null;
  error: string | null;
  loading: boolean;
  /** A preview is chosen, so Back to base has work to do beyond what Stop does. */
  canGoBack: boolean;
  onBackToBase: () => void;
  onStopServer: () => void;
  onRefresh: () => void;
}) {
  const { theme, labels, running, build, entry } = props;
  const server = running.kind === "preview" ? null : running.server;

  const name =
    running.kind === "preview"
      ? running.title
      : (server?.title ?? build.app.name ?? labels.base);
  const subtitle = [
    running.kind === "preview" ? running.id : null,
    entry?.branch ?? server?.branch,
  ]
    .filter((part, i, all) => part && all.indexOf(part) === i)
    .join(" · ");

  const facts: [string, string | null | undefined][] = [
    [labels.app, build.app.name],
    [
      labels.version,
      build.app.version &&
        (build.app.buildNumber
          ? `${build.app.version} (${build.app.buildNumber})`
          : build.app.version),
    ],
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
      build.key &&
        [
          build.compatibility === "fingerprint"
            ? labels.compatibilityFingerprint
            : build.compatibility === "appVersion"
              ? labels.compatibilityAppVersion
              : null,
          shortKey(build.key),
        ]
          .filter(Boolean)
          .join(" · "),
    ],
    ...(entry
      ? ([
          [labels.author, entry.author],
          [labels.commit, entry.commit?.slice(0, 7)],
          [
            labels.published,
            entry.publishedAt
              ? new Date(entry.publishedAt).toLocaleString()
              : null,
          ],
        ] as [string, string | null | undefined][])
      : []),
  ];

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
      {
        style: {
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 6,
        },
      },
      running.kind === "base"
        ? h(Chip, { key: "base", theme, text: labels.base, tone: "primary" })
        : null,
      h(Chip, {
        key: "kind",
        theme,
        text: runningKind(running, labels),
        tone: running.kind === "base" ? "neutral" : "primary",
      }),
      entry?.environment
        ? h(Chip, {
            key: "env",
            theme,
            text: entry.environment,
            tone: "success",
          })
        : null,
      props.loading
        ? h(ActivityIndicator, {
            key: "spinner",
            color: theme.primary,
            style: { marginLeft: "auto" },
          })
        : null,
    ),
    h(TitleSubtitle, {
      theme,
      title: name,
      subtitle: subtitle || null,
      size: "large",
    }),
    h(
      Text,
      {
        accessibilityLabel: `${labels.running}: ${runningLabel(running, labels)}`,
        style: { ...font(theme, "medium", 14), color: theme.text },
      },
      runningLabel(running, labels),
    ),
    h(
      View,
      {
        style: {
          flexDirection: "row",
          flexWrap: "wrap",
          rowGap: 10,
          columnGap: 12,
        },
      },
      ...facts
        .filter((fact): fact is [string, string] => Boolean(fact[1]))
        .map(([label, value]) => h(Fact, { key: label, theme, label, value })),
    ),
    // A dev preview server wins over a picked preview, so Metro is in use and the note would be wrong.
    __DEV__ && running.kind === "preview"
      ? h(
          Text,
          { style: { ...font(theme, "medium", 13), color: theme.warning } },
          labels.metroBypassed,
        )
      : null,
    props.error
      ? h(
          Text,
          { style: { ...font(theme, "regular", 13), color: theme.danger } },
          props.error,
        )
      : null,
    h(
      View,
      { style: { flexDirection: "row", flexWrap: "wrap", gap: 8 } },
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
            title: labels.stopDevPreviewServer,
            onPress: props.onStopServer,
            kind: "plain",
          })
        : null,
      h(Button, {
        key: "refresh",
        theme,
        title: labels.refresh,
        onPress: props.onRefresh,
        kind: "plain",
      }),
    ),
  );
}
