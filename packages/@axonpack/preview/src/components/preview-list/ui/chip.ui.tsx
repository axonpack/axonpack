import { Text, View } from "react-native";

import { ENVIRONMENT_TONE } from "../../../constants/preview-list/chip-tones.const";
import { toneColors } from "../../../utils/preview-list/color.util";
import { font } from "../../../utils/preview-list/theme.util";
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
}) {
  const { theme, tone = "neutral" } = props;
  const colors = toneColors(theme, tone);
  return (
    <View
      accessible={props.accessibilityLabel ? true : undefined}
      accessibilityLabel={props.accessibilityLabel}
      style={{
        paddingHorizontal: 10,
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
