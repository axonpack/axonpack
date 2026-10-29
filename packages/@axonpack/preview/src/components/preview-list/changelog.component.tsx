import { useState } from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";

import { font } from "../../utils/preview-list/theme.util";
import { Chevron } from "./ui/chevron.ui";
import type { PreviewListLabels, PreviewListTheme } from "./preview-list.types";

const COLLAPSED_LINES = 3;

/**
 * A changelog on the surface colour, cut to three lines with Show more when it is long. The whole
 * box is the button, so the toggle needs no 44-high row of its own.
 */
export function Changelog(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  text: string;
}) {
  const { theme, labels, text } = props;
  const [open, setOpen] = useState(false);
  // A guess from the text, not a measurement: onTextLayout counts lines differently on iOS and
  // Android once numberOfLines is set. A text taken for short is shown whole, never cut.
  const long = text.split("\n").length > COLLAPSED_LINES || text.length > 120;
  const box: ViewStyle = {
    backgroundColor: theme.surface,
    borderRadius: theme.radius / 2,
    padding: 10,
    gap: 6,
  };
  const body = (
    <Text
      numberOfLines={long && !open ? COLLAPSED_LINES : undefined}
      style={{ ...font(theme, "regular", 14), color: theme.text }}
    >
      {text}
    </Text>
  );
  if (!long) return <View style={box}>{body}</View>;
  return (
    <Pressable
      testID="changelog-toggle"
      onPress={() => setOpen(!open)}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      style={({ pressed }: { pressed: boolean }): ViewStyle => ({
        ...box,
        minHeight: 44,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {body}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ ...font(theme, "medium", 14), color: theme.primary }}>
          {open ? labels.showLess : labels.showMore}
        </Text>
        <Chevron color={theme.primary} open={open} />
      </View>
    </Pressable>
  );
}
