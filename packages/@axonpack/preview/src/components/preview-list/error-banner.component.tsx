import { Text, View } from "react-native";

import { font } from "../../utils/preview-list/theme.util";
import { Button } from "./ui/button.ui";
import { IconButton } from "./ui/icon-button.ui";
import type { PreviewListLabels, PreviewListTheme } from "./preview-list.types";

/** A list error above the header card. It stays until dismissed or the next action clears it. */
export function ErrorBanner(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  message: string;
  detail: string | null;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const { theme, labels } = props;
  return (
    <View
      testID="list-error"
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        backgroundColor: theme.dangerSurface,
        borderRadius: theme.radius,
        borderWidth: 1,
        borderColor: theme.danger,
        padding: 12,
        paddingLeft: 16,
      }}
    >
      <View style={{ flex: 1, gap: 6, paddingTop: 2 }}>
        <Text style={{ ...font(theme, "medium", 15), color: theme.danger }}>
          {props.message}
        </Text>
        {props.detail ? (
          <Text
            selectable
            style={{ ...font(theme, "regular", 13), color: theme.danger }}
          >
            {props.detail}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row" }}>
          <Button
            theme={theme}
            title={labels.retry}
            onPress={props.onRetry}
            kind="danger"
          />
        </View>
      </View>
      <IconButton
        theme={theme}
        label={labels.dismiss}
        onPress={props.onDismiss}
      >
        <Text
          importantForAccessibility="no"
          style={{ ...font(theme, "medium", 20), color: theme.danger }}
        >
          ×
        </Text>
      </IconButton>
    </View>
  );
}
