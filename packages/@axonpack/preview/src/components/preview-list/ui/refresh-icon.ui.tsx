import { View } from "react-native";

/**
 * A clockwise arrow drawn with borders: a ring with its top right quarter cut away, and a
 * triangle at the cut end. A font glyph sits off centre on Android, where font padding and the
 * fallback font's metrics push it down; borders sit the same on both platforms.
 */
export function RefreshIcon(props: { color: string }) {
  const { color } = props;
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={{ width: 16, height: 16 }}
    >
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: color,
          // The top border's quarter of the ring, turned to run from 12 to 3 o'clock.
          borderTopColor: "transparent",
          transform: [{ rotate: "45deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          // Its flat back on the ring's cut end at 12 o'clock, its point toward 3.
          left: 7,
          top: -3,
          width: 0,
          height: 0,
          borderTopWidth: 4,
          borderBottomWidth: 4,
          borderLeftWidth: 6,
          borderTopColor: "transparent",
          borderBottomColor: "transparent",
          borderLeftColor: color,
        }}
      />
    </View>
  );
}
