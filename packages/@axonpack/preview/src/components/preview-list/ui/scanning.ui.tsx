import { ActivityIndicator, Text, View } from "react-native";

import { font } from "../../../utils/preview-list/theme.util";
import type { PreviewListTheme } from "../preview-list.types";

/** A quiet spinner and label beside a heading while something runs. */
export function Scanning(props: {
  theme: PreviewListTheme;
  label: string;
  visible: boolean;
}) {
  const { theme, visible } = props;
  return (
    // Always laid out and only faded, so the heading keeps its height as it comes and goes.
    <View
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        opacity: visible ? 1 : 0,
      }}
    >
      <ActivityIndicator
        size="small"
        color={theme.muted}
        animating={visible}
        hidesWhenStopped={false}
      />
      <Text style={{ ...font(theme, "regular", 13), color: theme.muted }}>
        {props.label}
      </Text>
    </View>
  );
}
