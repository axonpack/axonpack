import { useState } from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";

import {
  type DevServerHost,
  type HostAddress,
  formatHost,
} from "../../utils/dev-preview-servers/hosts.util";
import type { GroupPosition } from "../../utils/preview-list/list-items.util";
import { font } from "../../utils/preview-list/theme.util";
import { AddHostField } from "./add-host-field.component";
import { Card } from "./ui/card.ui";
import { Chevron } from "./ui/chevron.ui";
import { CrossIcon } from "./ui/cross-icon.ui";
import { HostIcon } from "./ui/host-icon.ui";
import type { PreviewListLabels, PreviewListTheme } from "./preview-list.types";

const row: ViewStyle = {
  minHeight: 44,
  flexDirection: "row",
  alignItems: "center",
};

/**
 * The end of the dev servers card: the hosts it checks behind a Hosts row, so they don't crowd the
 * servers, then Add a host when the app allows it, which opens a field in its place. Host names
 * and Add a host start at the same edge, after the icon, under the Hosts row's text.
 */
export function DevServerHosts(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  hosts: DevServerHost[];
  allowCustomHosts: boolean;
  /** Where the hosts sit in the servers' grouped card: last. */
  position: GroupPosition;
  onAdd: (host: HostAddress) => void;
  onRemove: (host: HostAddress) => void;
}) {
  const { theme, labels, hosts } = props;
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const pressableRow =
    (gap: number) =>
    ({ pressed }: { pressed: boolean }): ViewStyle => ({
      ...row,
      gap,
      opacity: pressed ? 0.6 : 1,
    });

  return (
    <Card
      theme={theme}
      position={props.position}
      flush
      testID="dev-server-hosts"
    >
      <Pressable
        testID="hosts-toggle"
        onPress={() => setExpanded(!expanded)}
        accessibilityRole="button"
        accessibilityLabel={`${labels.hosts}, ${hosts.length}`}
        accessibilityState={{ expanded }}
        style={pressableRow(8)}
      >
        <Text
          style={{ flex: 1, ...font(theme, "medium", 15), color: theme.title }}
        >
          {labels.hosts}
        </Text>
        <Text style={{ ...font(theme, "regular", 15), color: theme.muted }}>
          {String(hosts.length)}
        </Text>
        <Chevron color={theme.muted} open={expanded} />
      </Pressable>
      {expanded
        ? hosts.map((host) => {
            const name = formatHost(host);
            return (
              <View
                key={`${host.source}:${name}`}
                testID="host-row"
                style={{
                  ...row,
                  gap: 12,
                  // Out to the card's edge, so the remove button's 44 stays inside its row:
                  // Android drops a touch outside the parent's bounds.
                  marginRight: -16,
                  paddingRight: host.source === "user" ? 0 : 16,
                }}
              >
                <HostIcon color={theme.muted} />
                <Text
                  selectable
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    ...font(theme, "regular", 15),
                    color: theme.text,
                  }}
                >
                  {name}
                </Text>
                {host.source === "user" ? (
                  <Pressable
                    onPress={() => props.onRemove(host)}
                    accessibilityRole="button"
                    accessibilityLabel={labels.removeHost.replace(
                      "{host}",
                      name,
                    )}
                    style={({ pressed }: { pressed: boolean }): ViewStyle => ({
                      width: 44,
                      height: 44,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.5 : 1,
                    })}
                  >
                    <CrossIcon color={theme.muted} diagonal />
                  </Pressable>
                ) : null}
              </View>
            );
          })
        : null}
      {!props.allowCustomHosts ? null : adding ? (
        <AddHostField
          theme={theme}
          labels={labels}
          hosts={hosts}
          onAdd={(host) => {
            props.onAdd(host);
            setAdding(false);
            // So the host just added shows, with its remove button.
            setExpanded(true);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Pressable
          onPress={() => setAdding(true)}
          accessibilityRole="button"
          style={pressableRow(12)}
        >
          {/* As wide as the host icon, so the text lines up with the host names. */}
          <View style={{ width: 16, alignItems: "center" }}>
            <CrossIcon color={theme.primary} />
          </View>
          <Text style={{ ...font(theme, "medium", 15), color: theme.primary }}>
            {labels.addHost}
          </Text>
        </Pressable>
      )}
    </Card>
  );
}
