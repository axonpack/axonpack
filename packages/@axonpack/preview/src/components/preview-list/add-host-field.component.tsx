import { useState } from "react";
import { Pressable, Text, TextInput, View, type ViewStyle } from "react-native";

import {
  type DevServerHost,
  type HostAddress,
  checkNewHost,
  formatHost,
  parseHost,
} from "../../utils/dev-preview-servers/hosts.util";
import { font } from "../../utils/preview-list/theme.util";
import { Button } from "./ui/button.ui";
import { CrossIcon } from "./ui/cross-icon.ui";
import { HostIcon } from "./ui/host-icon.ui";
import type { PreviewListLabels, PreviewListTheme } from "./preview-list.types";

/**
 * The field Add a host opens at the end of the dev servers card. It carries the same computer as
 * the host rows above it, so it reads as the next one being typed. The hint, or why the text can't
 * be added, sits under it and above the buttons: a tap on Add can only show an error that is on
 * screen too, and the return key closes the keyboard, which uncovers it.
 */
export function AddHostField(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  hosts: DevServerHost[];
  onAdd: (host: HostAddress) => void;
  onCancel: () => void;
}) {
  const { theme, labels } = props;
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const edit = (next: string) => {
    setText(next);
    setError(null);
  };
  const add = () => {
    const host = checkNewHost(text, props.hosts);
    if (typeof host !== "string") {
      props.onAdd(host);
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
  const edge = error ? theme.danger : focused ? theme.primary : theme.border;

  return (
    <View style={{ paddingTop: 4, paddingBottom: 12, gap: 6 }}>
      <View
        testID="add-host-field"
        style={{
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingLeft: 12,
          // The clear button brings its own room.
          paddingRight: text ? 4 : 12,
          borderWidth: 1,
          borderColor: edge,
          borderRadius: theme.radius / 1.5,
          backgroundColor: theme.background,
        }}
      >
        <HostIcon color={error || focused ? edge : theme.muted} />
        <TextInput
          testID="add-host-input"
          value={text}
          onChangeText={edit}
          onSubmitEditing={add}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
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
            flex: 1,
            ...font(theme, "regular", 15),
            color: theme.title,
            // React Native pads a TextInput by default; the row sets the height.
            padding: 0,
          }}
        />
        {text ? (
          <Pressable
            onPress={() => edit("")}
            accessibilityRole="button"
            accessibilityLabel={labels.clearHost}
            // The field's 44 is the target; this tops it up sideways.
            hitSlop={4}
            style={({ pressed }: { pressed: boolean }): ViewStyle => ({
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.muted,
              }}
            >
              <CrossIcon color={theme.background} size={8} diagonal />
            </View>
          </Pressable>
        ) : null}
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
        style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}
      >
        <Button
          theme={theme}
          title={labels.cancel}
          onPress={props.onCancel}
          kind="plain"
          quiet
        />
        <Button theme={theme} title={labels.addHostConfirm} onPress={add} />
      </View>
    </View>
  );
}
