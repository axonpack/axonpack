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
        style: {
          ...font(theme, "bold", size === "large" ? 22 : 17),
          color: theme.title,
        },
      },
      props.title,
    ),
    props.subtitle
      ? h(
          Text,
          { style: { ...font(theme, "regular", 14), color: theme.muted } },
          props.subtitle,
        )
      : null,
  );
}
