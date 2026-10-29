import type { ReactNode } from "react";
import { View } from "react-native";

import type { PreviewListTheme } from "../preview-list.types";

export function Card(props: { theme: PreviewListTheme; children?: ReactNode }) {
  const { theme } = props;
  return (
    <View
      style={{
        backgroundColor: theme.card,
        borderRadius: theme.radius,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 16,
        gap: 10,
      }}
    >
      {props.children}
    </View>
  );
}
