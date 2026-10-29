import { Text, View } from "react-native";

import type { DevPreviewServer } from "../../utils/dev-preview-servers/merge-servers.util";
import { font } from "../../utils/preview-list/theme.util";
import { Button } from "./ui/button.ui";
import { Card } from "./ui/card.ui";
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
  return (
    <Card theme={theme}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Text
          style={{
            ...font(theme, "bold", 16),
            color: theme.title,
            flexShrink: 1,
          }}
        >
          {server.title}
        </Text>
        {running ? (
          <Text style={{ ...font(theme, "medium", 13), color: theme.success }}>
            {labels.running}
          </Text>
        ) : null}
      </View>
      <Text style={{ ...font(theme, "regular", 13), color: theme.muted }}>
        {meta}
      </Text>
      {badge ? (
        <Text style={{ ...font(theme, "medium", 13), color: badge.color }}>
          {badge.text}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {running ? (
          <Button
            theme={theme}
            title={labels.stopDevPreviewServer}
            onPress={props.onStop}
            kind="plain"
          />
        ) : (
          <Button
            theme={theme}
            title={labels.switchTo}
            onPress={() => props.onSwitch(server)}
          />
        )}
      </View>
    </Card>
  );
}
