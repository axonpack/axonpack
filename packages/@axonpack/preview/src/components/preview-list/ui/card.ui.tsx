import type { ReactNode } from "react";
import { View } from "react-native";

import type { PreviewListTheme } from "../preview-list.types";

export function Card(props: {
  theme: PreviewListTheme;
  /** The header card's tint: what the app runs from now. */
  tinted?: boolean;
  testID?: string;
  children?: ReactNode;
}) {
  const { theme, tinted } = props;
  return (
    <View
      testID={props.testID}
      style={{
        backgroundColor: tinted ? theme.tint : theme.card,
        borderRadius: theme.radius,
        borderWidth: 1,
        borderColor: tinted ? theme.tintBorder : theme.border,
        padding: 16,
        gap: 10,
      }}
    >
      {props.children}
    </View>
  );
}
