import { ActivityIndicator, View } from "react-native";

import type { PreviewListTheme } from "../preview-list.types";

/** A quiet spinner right after a heading while something runs. `label` is what a screen reader says. */
export function Scanning(props: {
  theme: PreviewListTheme;
  label: string;
  visible: boolean;
}) {
  const { theme, visible } = props;
  return (
    // Always laid out and only faded, so the heading does not shift as it comes and goes.
    <View
      accessible={visible}
      accessibilityLabel={props.label}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? "yes" : "no-hide-descendants"}
      style={{ opacity: visible ? 1 : 0 }}
    >
      <ActivityIndicator
        size="small"
        color={theme.muted}
        animating={visible}
        hidesWhenStopped={false}
      />
    </View>
  );
}
