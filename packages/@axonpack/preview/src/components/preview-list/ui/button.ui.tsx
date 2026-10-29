import { Pressable, Text, type ViewStyle } from "react-native";

import { font } from "../../../utils/preview-list/theme.util";
import type { PreviewListTheme } from "../preview-list.types";

export type ButtonKind = "primary" | "plain" | "danger";

export function Button(props: {
  title: string;
  onPress: () => void;
  kind?: ButtonKind;
  /** Text only, no border: for an action that should not compete with the main one. */
  quiet?: boolean;
  /** What a screen reader says, when the title alone is not enough (one of many "Switch"). */
  accessibilityLabel?: string;
  theme: PreviewListTheme;
}) {
  const { theme, kind = "primary", quiet = false } = props;
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      style={({ pressed }: { pressed: boolean }): ViewStyle => ({
        minHeight: 44,
        paddingHorizontal: quiet ? 12 : 16,
        justifyContent: "center",
        borderRadius: theme.radius / 1.5,
        opacity: pressed ? 0.7 : 1,
        backgroundColor: kind === "primary" ? theme.primary : "transparent",
        borderWidth: kind === "primary" || quiet ? 0 : 1,
        borderColor: kind === "danger" ? theme.danger : theme.border,
      })}
    >
      <Text
        style={{
          ...font(theme, "medium", 15),
          color:
            kind === "primary"
              ? theme.primaryText
              : kind === "danger"
                ? theme.danger
                : theme.text,
        }}
      >
        {props.title}
      </Text>
    </Pressable>
  );
}
