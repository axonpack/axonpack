import { createElement as h, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useColorScheme,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import type { PreviewItem, PreviewStatus } from "../preview-items";
import { usePreviewReady } from "../provider";
import { DEFAULT_LABELS, formatSize, resolveTheme } from "./theme";
import type { PreviewListLabels, PreviewListTheme } from "./types";

export type PreviewListProps = {
  theme?: Partial<PreviewListTheme>;
  labels?: Partial<PreviewListLabels>;
  style?: StyleProp<ViewStyle>;
};

/**
 * The previews published for this build, with what is running now, and the downloads made for
 * another build in a section of their own. Needs a `<PreviewReadyProvider>` above it.
 */
export function PreviewList(props: PreviewListProps) {
  const preview = usePreviewReady();
  const theme = resolveTheme(props.theme, useColorScheme());
  const labels = {
    ...DEFAULT_LABELS,
    ...props.labels,
    status: { ...DEFAULT_LABELS.status, ...props.labels?.status },
  };
  const { radius, fonts } = theme;

  // A custom font family replaces the weight, since most families ship one file per weight.
  const font = (weight: "regular" | "medium" | "bold", size: number) => {
    const family = fonts[weight];
    return {
      fontSize: size,
      ...(family
        ? { fontFamily: family }
        : {
            fontWeight: (weight === "bold"
              ? "700"
              : weight === "medium"
                ? "600"
                : "400") as "700" | "600" | "400",
          }),
    };
  };

  const button = (
    title: string,
    onPress: () => void,
    kind: "primary" | "plain" | "danger" = "primary",
  ): ReactNode =>
    h(
      Pressable,
      {
        key: title,
        onPress,
        accessibilityRole: "button",
        style: ({ pressed }: { pressed: boolean }): ViewStyle => ({
          minHeight: 44,
          paddingHorizontal: 16,
          justifyContent: "center",
          borderRadius: radius / 1.5,
          opacity: pressed ? 0.7 : 1,
          backgroundColor: kind === "primary" ? theme.primary : "transparent",
          borderWidth: kind === "primary" ? 0 : 1,
          borderColor: kind === "danger" ? theme.danger : theme.border,
        }),
      },
      h(
        Text,
        {
          style: {
            ...font("medium", 15),
            color:
              kind === "primary"
                ? theme.primaryText
                : kind === "danger"
                  ? theme.danger
                  : theme.text,
          },
        },
        title,
      ),
    );

  const statusColor = (status: PreviewStatus) =>
    status === "broken"
      ? theme.danger
      : status === "update-available" || status === "unpublished"
        ? theme.warning
        : status === "downloaded"
          ? theme.success
          : theme.muted;

  const card = (key: string, children: ReactNode[]) =>
    h(
      View,
      {
        key,
        style: {
          backgroundColor: theme.card,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: theme.border,
          padding: 16,
          gap: 10,
        },
      },
      ...children,
    );

  const row = (item: PreviewItem) => {
    const { entry } = item;
    const date = entry.publishedAt
      ? new Date(entry.publishedAt).toLocaleString()
      : "";
    const meta = [
      entry.appVersion ? `v${entry.appVersion}` : "",
      entry.branch,
      entry.author,
      date,
      formatSize(entry.size),
    ]
      .filter(Boolean)
      .join(" · ");
    const actions: ReactNode[] = [];
    if (item.status === "available")
      actions.push(
        button(labels.download, () => preview.download(item.id), "plain"),
      );
    if (item.status === "update-available")
      actions.push(
        button(labels.update, () => preview.download(item.id), "plain"),
      );
    if (!item.active && item.status !== "downloading") {
      actions.push(button(labels.switchTo, () => preview.switchTo(item.id)));
    }
    if (item.local && item.status !== "downloading") {
      actions.push(
        button(labels.delete, () => preview.remove(item.id), "danger"),
      );
    }
    return card(
      item.id,
      [
        h(
          View,
          {
            key: "head",
            style: {
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 8,
            },
          },
          h(
            Text,
            {
              style: { ...font("bold", 17), color: theme.title, flexShrink: 1 },
            },
            entry.title,
          ),
          h(
            Text,
            {
              style: {
                ...font("medium", 13),
                color: item.active ? theme.success : statusColor(item.status),
              },
            },
            item.active ? labels.running : labels.status[item.status],
          ),
        ),
        h(
          Text,
          {
            key: "meta",
            style: { ...font("regular", 13), color: theme.muted },
          },
          meta,
        ),
        entry.changelog
          ? h(
              Text,
              {
                key: "changelog",
                style: {
                  ...font("regular", 14),
                  color: theme.text,
                  backgroundColor: theme.surface,
                  borderRadius: radius / 2,
                  padding: 10,
                },
              },
              entry.changelog,
            )
          : null,
        item.progress !== null
          ? h(
              View,
              {
                key: "progress",
                accessibilityRole: "progressbar",
                accessibilityValue: {
                  min: 0,
                  max: 100,
                  now: Math.round(item.progress * 100),
                },
                style: {
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: theme.surface,
                  overflow: "hidden",
                },
              },
              h(View, {
                style: {
                  width: `${Math.round(item.progress * 100)}%`,
                  height: 6,
                  backgroundColor: theme.primary,
                },
              }),
            )
          : null,
        actions.length > 0
          ? h(
              View,
              {
                key: "actions",
                style: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
              },
              ...actions,
            )
          : null,
      ].filter(Boolean) as ReactNode[],
    );
  };

  const active = preview.items.find((i) => i.active);
  const header = card(
    "header",
    [
      h(
        Text,
        { key: "title", style: { ...font("bold", 22), color: theme.title } },
        labels.title,
      ),
      h(
        Text,
        {
          key: "running",
          style: { ...font("regular", 15), color: theme.text },
        },
        `${labels.running}: ${active ? active.entry.title : (preview.activeId ?? labels.base)}`,
      ),
      __DEV__ && preview.activeId
        ? h(
            Text,
            {
              key: "metro",
              style: { ...font("medium", 13), color: theme.warning },
            },
            labels.metroBypassed,
          )
        : null,
      preview.error
        ? h(
            Text,
            {
              key: "error",
              style: { ...font("regular", 13), color: theme.danger },
            },
            preview.error,
          )
        : null,
      h(
        View,
        {
          key: "actions",
          style: {
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          },
        },
        preview.activeId
          ? button(labels.backToBase, () => preview.switchTo(null))
          : null,
        button(labels.refresh, () => preview.refresh(), "plain"),
        preview.loading
          ? h(ActivityIndicator, { key: "spinner", color: theme.primary })
          : null,
      ),
    ].filter(Boolean) as ReactNode[],
  );

  const empty =
    !preview.loading && preview.items.length === 0
      ? h(
          Text,
          {
            key: "empty",
            style: {
              ...font("regular", 15),
              color: theme.muted,
              textAlign: "center",
              padding: 16,
            },
          },
          preview.buildKey ? labels.empty : labels.noBuildKey,
        )
      : null;

  const incompatible =
    preview.incompatible.length > 0
      ? card("incompatible", [
          h(
            Text,
            {
              key: "title",
              style: { ...font("bold", 17), color: theme.title },
            },
            labels.incompatibleTitle,
          ),
          h(
            Text,
            {
              key: "hint",
              style: { ...font("regular", 13), color: theme.muted },
            },
            labels.incompatibleHint,
          ),
          ...preview.incompatible.map((p) =>
            h(
              Text,
              {
                key: p.id,
                style: { ...font("regular", 15), color: theme.text },
              },
              `${p.entry.title} · ${formatSize(p.entry.size)}`,
            ),
          ),
          h(
            View,
            { key: "actions", style: { flexDirection: "row" } },
            button(
              labels.deleteAll,
              () => preview.removeIncompatible(),
              "danger",
            ),
          ),
        ])
      : null;

  return h(
    ScrollView,
    {
      style: [{ backgroundColor: theme.background }, props.style],
      contentContainerStyle: { padding: 16, gap: 12 },
    },
    header,
    ...preview.items.map(row),
    empty,
    incompatible,
  );
}
