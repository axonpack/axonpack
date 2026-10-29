import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { font } from "../../../utils/preview-list/theme.util";
import type { PreviewListTheme } from "../preview-list.types";

export function SectionHeader(props: {
  theme: PreviewListTheme;
  title: string;
  hint?: string;
  error?: string | null;
  action?: ReactNode;
}) {
  const { theme } = props;
  return (
    <View style={{ gap: 4, paddingTop: 12, paddingHorizontal: 4 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{
            ...font(theme, "bold", 17),
            color: theme.title,
            flexShrink: 1,
          }}
        >
          {props.title}
        </Text>
        {props.action ?? null}
      </View>
      {props.hint ? (
        <Text style={{ ...font(theme, "regular", 13), color: theme.muted }}>
          {props.hint}
        </Text>
      ) : null}
      {props.error ? (
        <Text style={{ ...font(theme, "regular", 13), color: theme.danger }}>
          {props.error}
        </Text>
      ) : null}
    </View>
  );
}
