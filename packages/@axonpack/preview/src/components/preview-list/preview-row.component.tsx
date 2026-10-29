import { Text, View } from "react-native";

import type {
  PreviewItem,
  PreviewStatus,
} from "../../utils/previews/preview-items.util";
import { font, formatSize } from "../../utils/preview-list/theme.util";
import { timeAgo } from "../../utils/preview-list/time-ago.util";
import { Changelog } from "./changelog.component";
import { Button } from "./ui/button.ui";
import { Card } from "./ui/card.ui";
import { Chip, type ChipTone } from "./ui/chip.ui";
import { TitleSubtitle } from "./ui/title-subtitle.ui";
import type { PreviewListLabels, PreviewListTheme } from "./preview-list.types";

// Colour only where QA has something to do or to know; the action button already tells
// downloaded from not downloaded.
const STATUS_TONE: Record<PreviewStatus, ChipTone> = {
  available: "neutral",
  downloading: "neutral",
  downloaded: "neutral",
  "update-available": "warning",
  unpublished: "warning",
  broken: "danger",
};

/**
 * One published preview: its title and branch, chips for its state and environment, the
 * changelog, then who published it, when, and its size beside one main action and a quiet
 * Delete. The running one takes the header card's tint and says Active instead of Switch.
 */
export function PreviewRow(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  item: PreviewItem;
  /** The time "2 minutes ago" counts from. */
  now: number;
  onDownload: (id: string) => void;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { theme, labels, item } = props;
  const { entry, status, active } = item;
  const when = entry.publishedAt
    ? timeAgo(entry.publishedAt, props.now, labels.timeAgo)
    : "";
  const byline =
    entry.author && when
      ? labels.byline.replace("{author}", entry.author).replace("{time}", when)
      : entry.author || when;
  const bylineLabel = [
    entry.author ? `${labels.author}: ${entry.author}` : null,
    when
      ? `${labels.published}: ${new Date(entry.publishedAt).toLocaleString()}`
      : null,
  ]
    .filter(Boolean)
    .join(". ");

  const main =
    status === "available"
      ? { title: labels.download, onPress: () => props.onDownload(item.id) }
      : status === "update-available"
        ? { title: labels.update, onPress: () => props.onDownload(item.id) }
        : status === "downloading" || active
          ? null
          : { title: labels.switchTo, onPress: () => props.onSwitch(item.id) };
  const canDelete = item.local !== null && status !== "downloading";
  const percent =
    item.progress === null ? null : Math.round(item.progress * 100);

  return (
    <Card theme={theme} tinted={active} testID={`preview-${item.id}`}>
      <TitleSubtitle theme={theme} title={entry.title} detail={entry.branch} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {active ? (
          <Chip theme={theme} text={labels.active} tone="success" />
        ) : null}
        {/* Running means downloaded; saying both is noise. */}
        {active && status === "downloaded" ? null : (
          <Chip
            theme={theme}
            text={labels.status[status]}
            tone={STATUS_TONE[status]}
          />
        )}
        {entry.environment ? (
          <Chip theme={theme} text={entry.environment} tone="success" />
        ) : null}
      </View>
      {percent !== null ? (
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: percent }}
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.surface,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${percent}%`,
              height: 6,
              backgroundColor: theme.primary,
            }}
          />
        </View>
      ) : null}
      {entry.changelog ? (
        <Changelog theme={theme} labels={labels} text={entry.changelog} />
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <View style={{ flexShrink: 1, gap: 2 }}>
          {byline ? (
            <Text
              accessibilityLabel={bylineLabel}
              style={{ ...font(theme, "regular", 13), color: theme.muted }}
            >
              {byline}
            </Text>
          ) : null}
          <Text style={{ ...font(theme, "regular", 13), color: theme.muted }}>
            {formatSize(entry.size)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {canDelete ? (
            <Button
              theme={theme}
              title={labels.delete}
              accessibilityLabel={`${labels.delete}, ${entry.title}`}
              onPress={() => props.onDelete(item.id)}
              kind="danger"
              quiet
            />
          ) : null}
          {main ? (
            <Button
              theme={theme}
              title={main.title}
              accessibilityLabel={`${main.title}, ${entry.title}`}
              onPress={main.onPress}
            />
          ) : null}
        </View>
      </View>
    </Card>
  );
}
