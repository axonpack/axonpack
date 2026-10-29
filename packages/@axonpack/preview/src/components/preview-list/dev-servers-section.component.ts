import { createElement as h } from "react";
import { Text } from "react-native";

import type { DevPreviewServer } from "../../utils/dev-preview-servers/merge-servers.util";
import { font } from "../../utils/preview-list/theme.util";
import { Card } from "./ui/card.ui";
import { DevServerRow } from "./dev-server-row.component";
import type { PreviewListLabels, PreviewListTheme } from "./preview-list.types";

export function DevServersSection(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  servers: DevPreviewServer[];
  activeUrl: string | null;
  error: string | null;
  hasSlug: boolean;
  onSwitch: (server: DevPreviewServer | null) => void;
}) {
  const { theme, labels } = props;
  return h(
    Card,
    { theme },
    h(
      Text,
      { style: { ...font(theme, "bold", 17), color: theme.title } },
      labels.devPreviewServersTitle,
    ),
    h(
      Text,
      { style: { ...font(theme, "regular", 13), color: theme.muted } },
      labels.devPreviewServersHint,
    ),
    props.error
      ? h(
          Text,
          { style: { ...font(theme, "regular", 13), color: theme.danger } },
          props.error,
        )
      : null,
    !props.hasSlug
      ? h(
          Text,
          { style: { ...font(theme, "regular", 15), color: theme.danger } },
          labels.noBuildSlug,
        )
      : props.servers.length > 0
        ? props.servers.map((server) =>
            h(DevServerRow, {
              key: server.hostPort,
              theme,
              labels,
              server,
              running: server.url === props.activeUrl,
              onSwitch: props.onSwitch,
              onStop: () => props.onSwitch(null),
            }),
          )
        : h(
            Text,
            { style: { ...font(theme, "regular", 15), color: theme.muted } },
            labels.noDevPreviewServers,
          ),
  );
}
