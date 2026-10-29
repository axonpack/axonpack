import { Text } from "react-native";

import { font } from "../../utils/preview-list/theme.util";
import type { PreviewListTheme } from "./preview-list.types";

export function HintRow(props: {
  theme: PreviewListTheme;
  text: string;
  tone: "muted" | "danger";
}) {
  const { theme } = props;
  return (
    <Text
      style={{
        ...font(theme, "regular", 15),
        color: props.tone === "danger" ? theme.danger : theme.muted,
        textAlign: "center",
        padding: 16,
      }}
    >
      {props.text}
    </Text>
  );
}
