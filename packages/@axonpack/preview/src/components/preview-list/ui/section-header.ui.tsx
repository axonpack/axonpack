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
    // Text starts where the cards' text does, so headings and rows read down one edge.
    <View style={{ gap: 2, paddingTop: 12, paddingHorizontal: 16 }}>
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
        <Text style={{ ...font(theme, "regular", 15), color: theme.muted }}>
          {props.hint}
        </Text>
      ) : null}
      {props.error ? (
        <Text style={{ ...font(theme, "regular", 15), color: theme.danger }}>
          {props.error}
        </Text>
      ) : null}
    </View>
  );
}
