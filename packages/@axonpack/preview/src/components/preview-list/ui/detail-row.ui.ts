import { createElement as h } from "react";
import { Text, View } from "react-native";

import { font } from "../../../utils/preview-list/theme.util";
import type { PreviewListTheme } from "../preview-list.types";

/** One fact: its name on the left, the value on the right, so values scan down one edge. */
export function DetailRow(props: {
  theme: PreviewListTheme;
  label: string;
  value: string;
}) {
  const { theme } = props;
  return h(
    View,
    {
      style: {
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 16,
        paddingVertical: 6,
      },
    },
    h(
      Text,
      { style: { ...font(theme, "regular", 15), color: theme.muted } },
      props.label,
    ),
    h(
      Text,
      {
        selectable: true,
        style: {
          ...font(theme, "regular", 15),
          color: theme.text,
          flexShrink: 1,
          textAlign: "right",
        },
      },
      props.value,
    ),
  );
}
