import { createElement as h, type ReactNode } from "react";
import { Text, View } from "react-native";

import { font } from "../../../utils/preview-list/theme.util";
import type { PreviewListTheme } from "../preview-list.types";

export function SectionHeader(props: {
  theme: PreviewListTheme;
  title: string;
  hint?: string;
  error?: string | null;
  action?: ReactNode;
}) {
  const { theme } = props;
  return h(
    View,
    { style: { gap: 4, paddingTop: 12, paddingHorizontal: 4 } },
    h(
      View,
      {
        style: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        },
      },
      h(
        Text,
        {
          accessibilityRole: "header",
          style: {
            ...font(theme, "bold", 17),
            color: theme.title,
            flexShrink: 1,
          },
        },
        props.title,
      ),
      props.action ?? null,
    ),
    props.hint
      ? h(
          Text,
          { style: { ...font(theme, "regular", 13), color: theme.muted } },
          props.hint,
        )
      : null,
    props.error
      ? h(
          Text,
          { style: { ...font(theme, "regular", 13), color: theme.danger } },
          props.error,
        )
      : null,
  );
}
