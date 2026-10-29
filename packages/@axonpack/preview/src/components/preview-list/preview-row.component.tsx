import type { ReactNode } from "react";
import { Text, View } from "react-native";

import type {
  PreviewItem,
  PreviewStatus,
} from "../../utils/previews/preview-items.util";
import { font, formatSize } from "../../utils/preview-list/theme.util";
import { Button } from "./ui/button.ui";
import { Card } from "./ui/card.ui";
import type { PreviewListLabels, PreviewListTheme } from "./preview-list.types";

export function PreviewRow(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  item: PreviewItem;
  onDownload: (id: string) => void;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { theme, labels, item } = props;
  const { entry } = item;
  const statusColor = (status: PreviewStatus) =>
    status === "broken"
      ? theme.danger
      : status === "update-available" || status === "unpublished"
        ? theme.warning
        : status === "downloaded"
          ? theme.success
          : theme.muted;
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
  const action = (
    title: string,
    onPress: () => void,
    kind?: "plain" | "danger",
  ) =>
    actions.push(
      <Button
        key={title}
        theme={theme}
        title={title}
        onPress={onPress}
        kind={kind}
      />,
    );
  if (item.status === "available")
    action(labels.download, () => props.onDownload(item.id), "plain");
  if (item.status === "update-available")
    action(labels.update, () => props.onDownload(item.id), "plain");
  if (!item.active && item.status !== "downloading")
    action(labels.switchTo, () => props.onSwitch(item.id));
  if (item.local && item.status !== "downloading")
    action(labels.delete, () => props.onDelete(item.id), "danger");

  return (
    <Card theme={theme}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Text
          style={{
            ...font(theme, "bold", 17),
            color: theme.title,
            flexShrink: 1,
          }}
        >
          {entry.title}
        </Text>
        <Text
          style={{
            ...font(theme, "medium", 13),
            color: item.active ? theme.success : statusColor(item.status),
          }}
        >
          {item.active ? labels.running : labels.status[item.status]}
        </Text>
      </View>
      <Text style={{ ...font(theme, "regular", 13), color: theme.muted }}>
        {meta}
      </Text>
      {entry.changelog ? (
        <Text
          style={{
            ...font(theme, "regular", 14),
            color: theme.text,
            backgroundColor: theme.surface,
            borderRadius: theme.radius / 2,
            padding: 10,
          }}
        >
          {entry.changelog}
        </Text>
      ) : null}
      {item.progress !== null ? (
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(item.progress * 100),
          }}
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.surface,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${Math.round(item.progress * 100)}%`,
              height: 6,
              backgroundColor: theme.primary,
            }}
          />
        </View>
      ) : null}
      {actions.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {actions}
        </View>
      ) : null}
    </Card>
  );
}
