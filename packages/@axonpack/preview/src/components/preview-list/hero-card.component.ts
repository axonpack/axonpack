import { createElement as h } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import type { Running } from "../../utils/previews/running.util";
import { font } from "../../utils/preview-list/theme.util";
import { Button } from "./ui/button.ui";
import { Card } from "./ui/card.ui";
import type { PreviewListLabels, PreviewListTheme } from "./preview-list.types";

export function HeroCard(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  running: Running;
  error: string | null;
  loading: boolean;
  /** Something other than the base is chosen, so Back to base has work to do. */
  canGoBack: boolean;
  onBackToBase: () => void;
  onRefresh: () => void;
}) {
  const { theme, labels, running: now } = props;
  return h(
    Card,
    { theme },
    h(
      Text,
      { style: { ...font(theme, "bold", 22), color: theme.title } },
      labels.title,
    ),
    h(
      Text,
      { style: { ...font(theme, "regular", 15), color: theme.text } },
      `${labels.running}: ${
        now.kind === "local"
          ? now.server
            ? `${now.server.title} (${labels.localSuffix}, ${now.hostPort})`
            : `${now.hostPort} (${labels.localSuffix})`
          : now.kind === "preview"
            ? now.title
            : labels.base
      }`,
    ),
    // A dev preview server wins over a picked preview, so Metro is in use and the note would be wrong.
    __DEV__ && now.kind === "preview"
      ? h(
          Text,
          { style: { ...font(theme, "medium", 13), color: theme.warning } },
          labels.metroBypassed,
        )
      : null,
    props.error
      ? h(
          Text,
          { style: { ...font(theme, "regular", 13), color: theme.danger } },
          props.error,
        )
      : null,
    h(
      View,
      {
        style: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        },
      },
      props.canGoBack
        ? h(Button, {
            theme,
            title: labels.backToBase,
            onPress: props.onBackToBase,
          })
        : null,
      h(Button, {
        theme,
        title: labels.refresh,
        onPress: props.onRefresh,
        kind: "plain",
      }),
      props.loading ? h(ActivityIndicator, { color: theme.primary }) : null,
    ),
  );
}
