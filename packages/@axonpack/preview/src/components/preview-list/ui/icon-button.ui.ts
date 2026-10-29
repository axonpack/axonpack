import { createElement as h, type ReactNode } from "react";
import { Pressable, type ViewStyle } from "react-native";

import type { PreviewListTheme } from "../preview-list.types";

/** A round 44 x 44 button holding a glyph or a spinner; `label` is what a screen reader says. */
export function IconButton(props: {
  theme: PreviewListTheme;
  label: string;
  onPress: () => void;
  busy?: boolean;
  children?: ReactNode;
}) {
  const { theme } = props;
  return h(
    Pressable,
    {
      onPress: props.onPress,
      accessibilityRole: "button",
      accessibilityLabel: props.label,
      accessibilityState: { busy: Boolean(props.busy) },
      hitSlop: 4,
      style: ({ pressed }: { pressed: boolean }): ViewStyle => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
        opacity: pressed ? 0.7 : 1,
      }),
    },
    props.children,
  );
}
