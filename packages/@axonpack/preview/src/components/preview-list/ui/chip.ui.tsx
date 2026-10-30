import { Pressable, Text, View, type ViewStyle } from "react-native";

import {
  ENVIRONMENT_TONE,
  KIND_TONE,
  STATUS_TONE,
} from "../../../constants/preview-list/chip-tones.const";
import { toneColors } from "../../../utils/preview-list/color.util";
import { font } from "../../../utils/preview-list/theme.util";
import type { PreviewStatus } from "../../../utils/previews/preview-items.util";
import {
  type DefaultSource,
  kindLabel,
} from "../../../utils/previews/running.util";
import type {
  PreviewListLabels,
  PreviewListTheme,
} from "../preview-list.types";

export type ChipTone =
  | "primary"
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent2"
  | "accent3";

/** Text in the tone on a wash of it. A tone that can't be washed (not hex) gets an outline. */
export function Chip(props: {
  theme: PreviewListTheme;
  text: string;
  tone?: ChipTone;
  /** What a screen reader says instead of the text. */
  accessibilityLabel?: string;
  /** Room after the text, for something laid over the chip's end. */
  endSpace?: number;
}) {
  const { theme, tone = "neutral" } = props;
  const colors = toneColors(theme, tone);
  return (
    <View
      accessible={props.accessibilityLabel ? true : undefined}
      accessibilityLabel={props.accessibilityLabel}
      style={{
        paddingLeft: 10,
        paddingRight: props.endSpace ?? 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: colors.fill ? 0 : 1,
        borderColor: colors.text,
        backgroundColor: colors.fill ?? "transparent",
        alignSelf: "flex-start",
        // A long name ends in an ellipsis instead of running out of its row.
        maxWidth: "100%",
      }}
    >
      <Text
        numberOfLines={1}
        style={{ ...font(theme, "medium", 13), color: colors.text }}
      >
        {props.text}
      </Text>
    </View>
  );
}

/** "env: name" on the chip, but a screen reader hears "Environment name", not "env colon". */
export function EnvironmentChip(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  name: string;
}) {
  const { labels, name } = props;
  return (
    <Chip
      theme={props.theme}
      text={`${labels.environmentPrefix} ${name}`}
      accessibilityLabel={`${labels.environment} ${name}`}
      tone={ENVIRONMENT_TONE}
    />
  );
}

/** "status: downloaded" on the chip, and a screen reader hears "Status downloaded". */
export function StatusChip(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  status: PreviewStatus;
}) {
  const { labels, status } = props;
  // After the prefix the status reads as one phrase, like the environment's name does.
  const label = labels.statusShort[status];
  const text = label.charAt(0).toLowerCase() + label.slice(1);
  return (
    <Chip
      theme={props.theme}
      text={`${labels.statusPrefix} ${text}`}
      accessibilityLabel={`${labels.statusName} ${text}`}
      tone={STATUS_TONE[status]}
    />
  );
}

/** "server: Expo" on the chip, but a screen reader hears the kind's whole name, "Expo server". */
export function ServerChip(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  kind: Exclude<DefaultSource, "built-in">;
}) {
  const { labels, kind } = props;
  const name =
    kind === "expo-dev-server" ? labels.serverExpo : labels.serverPreview;
  return (
    <Chip
      theme={props.theme}
      text={`${labels.serverPrefix} ${name}`}
      accessibilityLabel={kindLabel(kind, labels)}
      tone={KIND_TONE[kind]}
    />
  );
}

/**
 * A chip with a remove button over its end. The ✕ is drawn, so no font moves it off centre, and
 * its 44 x 44 target reaches past the chip, inside a row tall enough to hold it: Android drops a
 * touch outside the parent's bounds.
 */
export function RemovableChip(props: {
  theme: PreviewListTheme;
  text: string;
  /** What a screen reader says for the button. */
  removeLabel: string;
  onRemove: () => void;
}) {
  const { theme } = props;
  const color = toneColors(theme, "neutral").text;
  const bar: ViewStyle = {
    position: "absolute",
    top: 5,
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: color,
  };
  return (
    <View style={{ flexDirection: "row", alignItems: "center", height: 44 }}>
      <Chip theme={theme} text={props.text} endSpace={30} />
      <Pressable
        onPress={props.onRemove}
        accessibilityRole="button"
        accessibilityLabel={props.removeLabel}
        style={({ pressed }: { pressed: boolean }): ViewStyle => ({
          width: 44,
          height: 44,
          marginLeft: -36,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.5 : 1,
        })}
      >
        <View style={{ width: 12, height: 12 }}>
          <View style={[bar, { transform: [{ rotate: "45deg" }] }]} />
          <View style={[bar, { transform: [{ rotate: "-45deg" }] }]} />
        </View>
      </Pressable>
    </View>
  );
}
