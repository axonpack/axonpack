import { Pressable, View } from "react-native";

import type { DevPreviewServer } from "../../utils/dev-preview-servers/merge-servers.util";
import type { GroupPosition } from "../../utils/preview-list/list-items.util";
import {
  type BundleKind,
  displayHostPort,
  kindLabel,
} from "../../utils/previews/running.util";
import {
  ACTIVE_TONE,
  KIND_TONE,
  OFFLINE_TONE,
} from "../../constants/preview-list/chip-tones.const";
import { BranchLine } from "./ui/branch-line.ui";
import { Card } from "./ui/card.ui";
import { Chevron } from "./ui/chevron.ui";
import { Chip, type ChipTone, ServerChip } from "./ui/chip.ui";
import { ChipRow } from "./ui/chip-row.ui";
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
  /** The app runs from it and it stopped answering. Its row stays, so QA sees why. */
  offline: boolean;
  /** The Metro the app starts on with nothing picked. */
  isDefault: boolean;
  /** The servers are one grouped card; this row's place in it. */
  position: GroupPosition;
  onSwitch: (server: DevPreviewServer) => void;
}) {
  const { theme, labels, server, active } = props;
  const address = displayHostPort(server.hostPort);
  // A title from `preview start` is a real name and stays. Metro only knows the app's name, the
  // same on every server of this app, so the rest go by their role or their address.
  const title = server.announced
    ? server.title
    : props.isDefault
      ? labels.defaultServerTitle
      : address;
  const subtitle = title === address ? null : address;
  const kind: BundleKind = server.unknown
    ? "server"
    : server.announced
      ? "dev-preview-server"
      : "expo-dev-server";
  // The kind chip is drawn as a ServerChip; `text` is what a screen reader says for it. A server
  // of no known kind gets a plain chip with no hue.
  const chips: ({ text: string; tone?: ChipTone; kind?: boolean } | null)[] = [
    active ? { text: labels.active, tone: ACTIVE_TONE } : null,
    props.offline ? { text: labels.offline, tone: OFFLINE_TONE } : null,
    kind === "server"
      ? { text: kindLabel(kind, labels), tone: KIND_TONE[kind] }
      : { text: kindLabel(kind, labels), kind: true },
    // Whether it runs or not, so the default is always easy to find.
    props.isDefault ? { text: labels.defaultBundle } : null,
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
          <TitleSubtitle theme={theme} title={title} subtitle={subtitle} />
          {server.branch ? (
            <BranchLine theme={theme} labels={labels} name={server.branch} />
          ) : null}
        </View>
        <ChipRow endBleed={0}>
          {shown.map((chip) =>
            chip.kind && kind !== "server" ? (
              <ServerChip
                key={chip.text}
                theme={theme}
                labels={labels}
                kind={kind}
              />
            ) : (
              <Chip
                key={chip.text}
                theme={theme}
                text={chip.text}
                tone={chip.tone}
              />
            ),
          )}
        </ChipRow>
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
        accessibilityLabel={[title, subtitle, said].filter(Boolean).join(", ")}
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
