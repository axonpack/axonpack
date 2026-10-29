import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import type { GroupPosition } from "../../../utils/preview-list/list-items.util";
import type { PreviewListTheme } from "../preview-list.types";

/**
 * A card, or one row of a group drawn as one card (iOS Settings style): the first row takes the
 * top corners, the last the bottom ones, and each row after the first has a hairline above it,
 * inset to where the text starts.
 */
export function Card(props: {
  theme: PreviewListTheme;
  /** The header card's tint: what the app runs from now. */
  tinted?: boolean;
  /** Held down, when the whole card is the button. */
  pressed?: boolean;
  /** Default "only": a card on its own. */
  position?: GroupPosition;
  testID?: string;
  children?: ReactNode;
}) {
  const { theme, tinted, pressed, position = "only" } = props;
  const top = position === "first" || position === "only";
  const bottom = position === "last" || position === "only";
  const corner = (round: boolean) => (round ? theme.radius : 0);
  return (
    <View
      testID={props.testID}
      style={{
        backgroundColor: tinted
          ? theme.tint
          : pressed
            ? theme.surface
            : theme.card,
        borderTopLeftRadius: corner(top),
        borderTopRightRadius: corner(top),
        borderBottomLeftRadius: corner(bottom),
        borderBottomRightRadius: corner(bottom),
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderTopWidth: top ? 1 : 0,
        borderBottomWidth: bottom ? 1 : 0,
        // In a group the outline runs unbroken past a tinted row.
        borderColor:
          tinted && position === "only" ? theme.tintBorder : theme.border,
        padding: 16,
        gap: 10,
      }}
    >
      {top ? null : (
        <View
          testID="group-separator"
          style={{
            position: "absolute",
            top: 0,
            left: 16,
            right: 0,
            height: StyleSheet.hairlineWidth,
            backgroundColor: theme.border,
          }}
        />
      )}
      {props.children}
    </View>
  );
}
