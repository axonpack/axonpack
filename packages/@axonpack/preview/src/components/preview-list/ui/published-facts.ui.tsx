import { Text, View } from "react-native";

import type { IndexEntry } from "../../../utils/previews/layout.util";
import { font, formatSize } from "../../../utils/preview-list/theme.util";
import { timeAgo } from "../../../utils/preview-list/time-ago.util";
import type {
  PreviewListLabels,
  PreviewListTheme,
} from "../preview-list.types";

/**
 * Who published a preview and how long ago ("Ana, 2 minutes ago", with the full date for a screen
 * reader), then its size, in two quiet lines.
 */
export function PublishedFacts(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  entry: IndexEntry;
  /** The time "2 minutes ago" counts from. */
  now: number;
}) {
  const { theme, labels, entry } = props;
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
  const quiet = { ...font(theme, "regular", 13), color: theme.muted };
  return (
    <View style={{ flexShrink: 1, gap: 2 }}>
      {byline ? (
        <Text accessibilityLabel={bylineLabel} style={quiet}>
          {byline}
        </Text>
      ) : null}
      <Text style={quiet}>{formatSize(entry.size)}</Text>
    </View>
  );
}
