import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import {
  type DevServerHost,
  type HostAddress,
  checkNewHost,
  formatHost,
  parseHost,
} from "../../utils/dev-preview-servers/hosts.util";
import { font } from "../../utils/preview-list/theme.util";
import { Button } from "./ui/button.ui";
import { Chip, RemovableChip } from "./ui/chip.ui";
import type { PreviewListLabels, PreviewListTheme } from "./preview-list.types";

/**
 * The hosts the dev servers list checks, under its heading: the built-in and the app's as quiet
 * chips, the ones added on the device with a remove button, then Add a host when the app allows
 * it, which opens a field in place.
 */
export function DevServerHosts(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  hosts: DevServerHost[];
  allowCustomHosts: boolean;
  onAdd: (host: HostAddress) => void;
  onRemove: (host: HostAddress) => void;
}) {
  const { theme, labels } = props;
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setAdding(false);
    setText("");
    setError(null);
  };
  const add = () => {
    const host = checkNewHost(text, props.hosts);
    if (typeof host !== "string") {
      props.onAdd(host);
      close();
      return;
    }
    const typed = parseHost(text);
    setError(
      host === "invalid" || !typed
        ? labels.hostInvalid
        : (host === "duplicate"
            ? labels.hostDuplicate
            : labels.hostBuiltIn
          ).replace("{host}", formatHost(typed)),
    );
  };

  return (
    // Starts where the heading's text does.
    <View testID="dev-server-hosts" style={{ paddingHorizontal: 16, gap: 8 }}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 6,
        }}
      >
        {props.hosts.map((host) => {
          const name = formatHost(host);
          return host.source === "user" ? (
            <RemovableChip
              key={`${host.source}:${name}`}
              theme={theme}
              text={name}
              removeLabel={labels.removeHost.replace("{host}", name)}
              onRemove={() => props.onRemove(host)}
            />
          ) : (
            <Chip key={`${host.source}:${name}`} theme={theme} text={name} />
          );
        })}
        {props.allowCustomHosts && !adding ? (
          <Button
            theme={theme}
            title={labels.addHost}
            onPress={() => setAdding(true)}
            kind="primary"
            quiet
          />
        ) : null}
      </View>
      {adding ? (
        <View style={{ gap: 4 }}>
          <View
            style={{
              minHeight: 44,
              justifyContent: "center",
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: error ? theme.danger : theme.border,
              borderRadius: theme.radius / 1.5,
              backgroundColor: theme.card,
            }}
          >
            <TextInput
              testID="add-host-input"
              value={text}
              onChangeText={(next: string) => {
                setText(next);
                setError(null);
              }}
              onSubmitEditing={add}
              placeholder={labels.addHostPlaceholder}
              placeholderTextColor={theme.muted}
              accessibilityLabel={labels.addHost}
              accessibilityHint={labels.addHostHint}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              style={{
                ...font(theme, "regular", 15),
                color: theme.title,
                // React Native pads a TextInput by default; the row sets the height.
                padding: 0,
              }}
            />
          </View>
          <Text
            testID={error ? "add-host-error" : undefined}
            accessibilityLiveRegion={error ? "polite" : "none"}
            style={{
              ...font(theme, "regular", 13),
              lineHeight: 18,
              color: error ? theme.danger : theme.muted,
            }}
          >
            {error ?? labels.addHostHint}
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              // As in the error banner: the last button's text ends where the field does.
              marginRight: -12,
            }}
          >
            <Button
              theme={theme}
              title={labels.cancel}
              onPress={close}
              kind="plain"
              quiet
            />
            <Button
              theme={theme}
              title={labels.addHostConfirm}
              onPress={add}
              kind="primary"
              quiet
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
