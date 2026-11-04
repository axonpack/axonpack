import { Text } from "react-native";

import type { GroupPosition } from "../../utils/preview-list/list-items.util";
import { font } from "../../utils/preview-list/theme.util";
import { Card } from "./ui/card.ui";
import type { PreviewListTheme } from "./preview-list.types";

export function HintRow(props: {
  theme: PreviewListTheme;
  text: string;
  tone: "muted" | "danger";
  /** A row of a grouped card, in place of the rows it says are missing. */
  position?: GroupPosition;
}) {
  const { theme, position } = props;
  const text = (
    <Text
      style={{
        ...font(theme, "regular", 15),
        color: props.tone === "danger" ? theme.danger : theme.muted,
        // In a card it starts where the other rows' text does.
        textAlign: position ? "left" : "center",
        padding: position ? 0 : 16,
      }}
    >
      {props.text}
    </Text>
  );
  return position ? (
    <Card theme={theme} position={position}>
      {text}
    </Card>
  ) : (
    text
  );
}
