import { Platform, StyleSheet, Text, View } from "react-native";

import { font } from "../../utils/preview-list/theme.util";
import { Button } from "./ui/button.ui";
import type { PreviewListLabels, PreviewListTheme } from "./preview-list.types";

/**
 * A list error above the header card: what went wrong, then what to try, with red only on its
 * edge. It stays until dismissed or the next action clears it. Without `onRetry` there is no Retry.
 */
export function ErrorBanner(props: {
  theme: PreviewListTheme;
  labels: PreviewListLabels;
  message: string;
  hint: string | null;
  onRetry?: () => void;
  onDismiss: () => void;
}) {
  const { theme, labels, onRetry } = props;
  const codeFont = Platform.OS === "ios" ? "Menlo" : "monospace";
  return (
    <View
      testID="list-error"
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={{
        gap: 2,
        backgroundColor: theme.dangerSurface,
        borderRadius: theme.radius,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.border,
        // Clips the red edge to the rounded corners.
        overflow: "hidden",
        paddingTop: 12,
        paddingHorizontal: 16,
      }}
    >
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          backgroundColor: theme.danger,
        }}
      />
      <Text style={{ ...font(theme, "medium", 15), color: theme.title }}>
        {props.message}
      </Text>
      {props.hint ? (
        <Text
          testID="list-error-hint"
          selectable
          style={{
            ...font(theme, "regular", 13),
            lineHeight: 18,
            color: theme.muted,
          }}
        >
          {/* The odd pieces were between backticks: a command or an address to type. */}
          {props.hint.split("`").map((piece, i) =>
            i % 2 ? (
              <Text key={i} style={{ fontFamily: codeFont, color: theme.text }}>
                {piece}
              </Text>
            ) : (
              piece
            ),
          )}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          // Pulled right so the last button's text ends where the lines above can end. Their 44
          // for the finger stands in for the bottom padding.
          marginRight: -12,
        }}
      >
        <Button
          theme={theme}
          title={labels.dismiss}
          onPress={props.onDismiss}
          kind="plain"
          quiet
        />
        {onRetry ? (
          <Button
            theme={theme}
            title={labels.retry}
            onPress={onRetry}
            kind="primary"
            quiet
          />
        ) : null}
      </View>
    </View>
  );
}
