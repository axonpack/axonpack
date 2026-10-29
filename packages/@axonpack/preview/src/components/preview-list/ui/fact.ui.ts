import { createElement as h } from "react";
import { Text, View } from "react-native";

import { font } from "../../../utils/preview-list/theme.util";
import type { PreviewListTheme } from "../preview-list.types";

/** A small label over its value, laid out two to a row. */
export function Fact(props: {
  theme: PreviewListTheme;
  label: string;
  value: string;
}) {
  const { theme } = props;
  return h(
    View,
    { style: { flexBasis: "45%", flexGrow: 1, gap: 2 } },
    h(
      Text,
      { style: { ...font(theme, "medium", 12), color: theme.muted } },
      props.label,
    ),
    h(
      Text,
      {
        selectable: true,
        style: { ...font(theme, "regular", 14), color: theme.text },
      },
      props.value,
    ),
  );
}
