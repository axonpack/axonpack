import { Text, View } from "react-native";

import { font } from "../../../utils/preview-list/theme.util";
import type { PreviewListTheme } from "../preview-list.types";

export type ChipTone = "primary" | "neutral" | "success" | "warning" | "danger";

export function Chip(props: {
  theme: PreviewListTheme;
  text: string;
  tone?: ChipTone;
}) {
  const { theme, tone = "neutral" } = props;
  const color =
    tone === "primary"
      ? theme.primaryText
      : tone === "success"
        ? theme.success
        : tone === "warning"
          ? theme.warning
          : tone === "danger"
            ? theme.danger
            : theme.text;
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor:
          tone === "primary"
            ? theme.primary
            : tone === "neutral"
              ? theme.border
              : color,
        backgroundColor: tone === "primary" ? theme.primary : theme.card,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ ...font(theme, "medium", 13), color }}>{props.text}</Text>
    </View>
  );
}
