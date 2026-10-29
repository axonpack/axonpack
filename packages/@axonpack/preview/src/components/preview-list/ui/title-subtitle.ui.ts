import { createElement as h } from "react";
import { Text, View } from "react-native";

import { font } from "../../../utils/preview-list/theme.util";
import type { PreviewListTheme } from "../preview-list.types";

export function TitleSubtitle(props: {
  theme: PreviewListTheme;
  title: string;
  subtitle?: string | null;
  size?: "large" | "medium";
}) {
  const { theme, size = "medium" } = props;
  return h(
    View,
    { style: { gap: 2, flexShrink: 1 } },
    h(
      Text,
      {
        accessibilityRole: size === "large" ? "header" : undefined,
        numberOfLines: 2,
        ellipsizeMode: "tail",
        style: {
          // One step above the section headings (17), so it leads the card without shouting.
          ...font(theme, "bold", size === "large" ? 20 : 17),
          color: theme.title,
        },
      },
      props.title,
    ),
    props.subtitle
      ? h(
          Text,
          {
            selectable: true,
            style: { ...font(theme, "regular", 15), color: theme.muted },
          },
          props.subtitle,
        )
      : null,
  );
}
