import { Text, View } from "react-native";

import { font } from "../../../utils/preview-list/theme.util";
import type { PreviewListTheme } from "../preview-list.types";

export function TitleSubtitle(props: {
  theme: PreviewListTheme;
  title: string;
  subtitle?: string | null;
  size?: "large" | "medium";
  /** A quieter line under the subtitle, or under the title when there is none: the branch. */
  detail?: string | null;
}) {
  const { theme, size = "medium" } = props;
  return (
    <View style={{ gap: 2, flexShrink: 1 }}>
      <Text
        accessibilityRole={size === "large" ? "header" : undefined}
        numberOfLines={2}
        ellipsizeMode="tail"
        style={{
          // Large leads the header card, one step above the section headings (17). Medium is a
          // row's title, one step below them, so a heading still leads its rows.
          ...font(theme, "bold", size === "large" ? 20 : 16),
          color: theme.title,
        }}
      >
        {props.title}
      </Text>
      {props.subtitle ? (
        <Text
          selectable
          style={{ ...font(theme, "regular", 15), color: theme.muted }}
        >
          {props.subtitle}
        </Text>
      ) : null}
      {props.detail ? (
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{ ...font(theme, "regular", 13), color: theme.muted }}
        >
          {props.detail}
        </Text>
      ) : null}
    </View>
  );
}
