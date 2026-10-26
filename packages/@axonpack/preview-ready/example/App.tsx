import { previewTitle } from "@axonpack/preview-ready";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

// TODO(@axonpack/preview-ready): the preview list goes here once the package has one.
export default function App() {
  return (
    <View style={styles.container}>
      <Text>{previewTitle("embedded-bundle")}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
});
