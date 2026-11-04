import { View } from "react-native";

/**
 * Two borders of a small square, turned to point right (closed) or down (open). The same mark
 * turns, so the change shows what happened, and it needs no icon font.
 */
export function Chevron(props: { color: string; open: boolean }) {
  return (
    <View
      style={{
        width: 7,
        height: 7,
        borderRightWidth: 2,
        borderBottomWidth: 2,
        borderColor: props.color,
        // Pointing down, the mark sits low, so it is nudged up to centre on the text.
        marginTop: props.open ? -3 : 0,
        transform: [{ rotate: props.open ? "45deg" : "-45deg" }],
      }}
    />
  );
}
