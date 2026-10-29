import { createElement as h } from "react";
import { Text, View } from "react-native";

import type { DevPreviewServer } from "../../utils/dev-preview-servers/merge-servers.util";
import { font } from "../../utils/preview-list/theme.util";
import { Button } from "./ui/button.ui";
import type { PreviewListLabels, PreviewListTheme } from "./preview-list.types";

export function DevServerRow(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  server: DevPreviewServer;
  running: boolean;
  onSwitch: (server: DevPreviewServer) => void;
  onStop: () => void;
}) {
  const { theme, labels, server, running } = props;
  const meta = [
    server.branch,
    server.hostPort,
    server.version ? `v${server.version}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const badge =
    server.compatible === false
      ? { text: labels.localIncompatible, color: theme.warning }
      : server.compatible === null
        ? { text: labels.localUnknownBuild, color: theme.muted }
        : null;
  return h(
    View,
    {
      style: {
        gap: 6,
        paddingTop: 8,
        borderTopWidth: 1,
        borderColor: theme.border,
      },
    },
    h(
      View,
      {
        style: {
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 8,
        },
      },
      h(
        Text,
        {
          style: {
            ...font(theme, "bold", 16),
            color: theme.title,
            flexShrink: 1,
          },
        },
        server.title,
      ),
      running
        ? h(
            Text,
            { style: { ...font(theme, "medium", 13), color: theme.success } },
            labels.running,
          )
        : null,
    ),
    h(
      Text,
      { style: { ...font(theme, "regular", 13), color: theme.muted } },
      meta,
    ),
    badge
      ? h(
          Text,
          { style: { ...font(theme, "medium", 13), color: badge.color } },
          badge.text,
        )
      : null,
    h(
      View,
      { style: { flexDirection: "row", flexWrap: "wrap", gap: 8 } },
      running
        ? h(Button, {
            theme,
            title: labels.stopDevPreviewServer,
            onPress: props.onStop,
            kind: "plain",
          })
        : h(Button, {
            theme,
            title: labels.switchTo,
            onPress: () => props.onSwitch(server),
          }),
    ),
  );
}
