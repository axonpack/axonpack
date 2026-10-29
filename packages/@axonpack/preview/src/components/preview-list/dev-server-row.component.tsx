import { View } from "react-native";

import type { DevPreviewServer } from "../../utils/dev-preview-servers/merge-servers.util";
import { displayHostPort } from "../../utils/previews/running.util";
import { Button } from "./ui/button.ui";
import { Card } from "./ui/card.ui";
import { Chip } from "./ui/chip.ui";
import { TitleSubtitle } from "./ui/title-subtitle.ui";
import type { PreviewListLabels, PreviewListTheme } from "./preview-list.types";

/**
 * One Metro server: its name and address, then chips for what it is. The one the app runs from
 * takes the header card's tint and says Active instead of offering Switch.
 */
export function DevServerRow(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  server: DevPreviewServer;
  /** The app runs from this server now. */
  active: boolean;
  /** The Metro the app starts on with nothing picked. */
  isDefault: boolean;
  onSwitch: (server: DevPreviewServer) => void;
}) {
  const { theme, labels, server, active } = props;
  // Metro only knows the app's name, the same on every server of this app, so the one the app
  // starts on is called by its role. A title from `preview start` is a real name and stays.
  const title =
    !server.announced && props.isDefault
      ? labels.defaultServerTitle
      : server.title;
  const compatibility =
    server.compatible === false ? (
      <Chip theme={theme} text={labels.localIncompatible} tone="warning" />
    ) : server.compatible === null ? (
      <Chip theme={theme} text={labels.localUnknownBuild} />
    ) : null;
  return (
    <Card theme={theme} tinted={active} testID={`server-${server.hostPort}`}>
      <TitleSubtitle
        theme={theme}
        title={title}
        subtitle={displayHostPort(server.hostPort)}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {active ? (
          <Chip theme={theme} text={labels.active} tone="success" />
        ) : null}
        <Chip
          theme={theme}
          text={
            server.announced
              ? labels.kindDevPreviewServer
              : labels.kindExpoDevServer
          }
        />
        {server.branch ? <Chip theme={theme} text={server.branch} /> : null}
        {compatibility}
      </View>
      {active ? null : (
        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
          <Button
            theme={theme}
            title={labels.switchTo}
            accessibilityLabel={`${labels.switchTo}, ${title}`}
            onPress={() => props.onSwitch(server)}
          />
        </View>
      )}
    </Card>
  );
}
