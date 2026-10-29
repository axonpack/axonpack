import { Pressable, View } from "react-native";

import type { DevPreviewServer } from "../../utils/dev-preview-servers/merge-servers.util";
import type { GroupPosition } from "../../utils/preview-list/list-items.util";
import { displayHostPort, kindLabel } from "../../utils/previews/running.util";
import {
  ACTIVE_TONE,
  KIND_TONE,
} from "../../constants/preview-list/chip-tones.const";
import { BranchLine } from "./ui/branch-line.ui";
import { Card } from "./ui/card.ui";
import { Chevron } from "./ui/chevron.ui";
import { Chip, type ChipTone } from "./ui/chip.ui";
import { TitleSubtitle } from "./ui/title-subtitle.ui";
import type { PreviewListLabels, PreviewListTheme } from "./preview-list.types";

/**
 * One Metro server, as a row of the servers' grouped card: its name, address and branch, then
 * chips for what it is. The whole row switches to it, with a chevron to say so. The one the app runs from takes the header card's tint, says
 * Active, and does nothing when pressed.
 */
export function DevServerRow(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  server: DevPreviewServer;
  /** The app runs from this server now. */
  active: boolean;
  /** The Metro the app starts on with nothing picked. */
  isDefault: boolean;
  /** The servers are one grouped card; this row's place in it. */
  position: GroupPosition;
  onSwitch: (server: DevPreviewServer) => void;
}) {
  const { theme, labels, server, active } = props;
  // Metro only knows the app's name, the same on every server of this app, so the one the app
  // starts on is called by its role. A title from `preview start` is a real name and stays.
  const title =
    !server.announced && props.isDefault
      ? labels.defaultServerTitle
      : server.title;
  const address = displayHostPort(server.hostPort);
  const kind = server.announced ? "dev-preview-server" : "expo-dev-server";
  const chips: ({ text: string; tone?: ChipTone } | null)[] = [
    active ? { text: labels.active, tone: ACTIVE_TONE } : null,
    { text: kindLabel(kind, labels), tone: KIND_TONE[kind] },
    // Still switchable: the warning says why it may not start.
    server.compatible === false
      ? { text: labels.localIncompatible, tone: "warning" }
      : server.compatible === null
        ? { text: labels.localUnknownBuild }
        : null,
  ];
  const shown = chips.filter((chip) => chip !== null);
  // The row's own label replaces what is inside it, so the branch and chips are read out after it.
  const said = [
    server.branch && `${labels.branch} ${server.branch}`,
    ...shown.map((chip) => chip.text),
  ]
    .filter(Boolean)
    .join(", ");

  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, gap: 10 }}>
        <View style={{ gap: 6 }}>
          <TitleSubtitle theme={theme} title={title} subtitle={address} />
          {server.branch ? (
            <BranchLine theme={theme} labels={labels} name={server.branch} />
          ) : null}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {shown.map((chip) => (
            <Chip
              key={chip.text}
              theme={theme}
              text={chip.text}
              tone={chip.tone}
            />
          ))}
        </View>
      </View>
      {active ? null : <Chevron color={theme.muted} open={false} />}
    </View>
  );
  const testID = `server-${server.hostPort}`;

  if (active)
    return (
      <View
        testID={testID}
        accessible
        accessibilityLabel={`${title}, ${address}, ${said}`}
        accessibilityState={{ selected: true }}
      >
        <Card theme={theme} tinted position={props.position}>
          {body}
        </Card>
      </View>
    );
  return (
    <Pressable
      testID={testID}
      onPress={() => props.onSwitch(server)}
      accessibilityRole="button"
      accessibilityLabel={`${labels.switchToServer
        .replace("{title}", title)
        .replace("{address}", address)}, ${said}`}
      accessibilityHint={labels.switchToServerHint}
    >
      {({ pressed }: { pressed: boolean }) => (
        <Card theme={theme} pressed={pressed} position={props.position}>
          {body}
        </Card>
      )}
    </Pressable>
  );
}
