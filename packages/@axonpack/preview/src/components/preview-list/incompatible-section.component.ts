import { createElement as h } from "react";
import { Text, View } from "react-native";

import type { LocalPreview } from "../../services/previews/local-previews.service";
import { font, formatSize } from "../../utils/preview-list/theme.util";
import { Button } from "./ui/button.ui";
import { Card } from "./ui/card.ui";
import type { PreviewListLabels, PreviewListTheme } from "./preview-list.types";

export function IncompatibleSection(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  previews: LocalPreview[];
  onDeleteAll: () => void;
}) {
  const { theme, labels } = props;
  return h(
    Card,
    { theme },
    h(
      Text,
      { style: { ...font(theme, "bold", 17), color: theme.title } },
      labels.incompatibleTitle,
    ),
    h(
      Text,
      { style: { ...font(theme, "regular", 13), color: theme.muted } },
      labels.incompatibleHint,
    ),
    ...props.previews.map((p) =>
      h(
        Text,
        {
          key: p.id,
          style: { ...font(theme, "regular", 15), color: theme.text },
        },
        `${p.entry.title} · ${formatSize(p.entry.size)}`,
      ),
    ),
    h(
      View,
      { style: { flexDirection: "row" } },
      h(Button, {
        theme,
        title: labels.deleteAll,
        onPress: props.onDeleteAll,
        kind: "danger",
      }),
    ),
  );
}
