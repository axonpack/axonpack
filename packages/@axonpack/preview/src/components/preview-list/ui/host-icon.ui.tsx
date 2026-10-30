import { View } from "react-native";

/** A small computer screen on a stand, drawn with borders so no icon font is needed. */
export function HostIcon(props: { color: string }) {
  const { color } = props;
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={{ width: 16, alignItems: "center" }}
    >
      <View
        style={{
          width: 16,
          height: 11,
          borderWidth: 1.5,
          borderRadius: 2.5,
          borderColor: color,
        }}
      />
      <View
        style={{
          width: 8,
          height: 1.5,
          marginTop: 1.5,
          borderRadius: 1,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
