import { View, type ViewStyle } from "react-native";

/**
 * A plus, or turned a quarter for a ✕. Drawn from two bars, so no font moves it off centre.
 */
export function CrossIcon(props: {
  color: string;
  /** Default 12. */
  size?: number;
  /** A ✕ instead of a plus. */
  diagonal?: boolean;
}) {
  const size = props.size ?? 12;
  const turn = props.diagonal ? 45 : 0;
  const bar: ViewStyle = {
    position: "absolute",
    top: (size - 2) / 2,
    width: size,
    height: 2,
    borderRadius: 1,
    backgroundColor: props.color,
  };
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}
    >
      <View style={[bar, { transform: [{ rotate: `${turn}deg` }] }]} />
      <View style={[bar, { transform: [{ rotate: `${turn + 90}deg` }] }]} />
    </View>
  );
}
