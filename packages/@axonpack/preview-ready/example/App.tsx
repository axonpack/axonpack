import { previewTitle, reload } from "@axonpack/preview-ready";
import { StatusBar } from "expo-status-bar";
import { Button, Image, StyleSheet, Text, View } from "react-native";

// Set at bundle time, so a test preview can be told apart from the embedded bundle without
// editing this file: EXPO_PUBLIC_BUNDLE_LABEL=preview-bundle npx expo export:embed ...
const label = process.env.EXPO_PUBLIC_BUNDLE_LABEL ?? "embedded-bundle";

// TODO(@axonpack/preview-ready): the preview list goes here once the package has one.
export default function App() {
  return (
    <View style={styles.container}>
      <Text testID="bundle-label">{previewTitle(label)}</Text>
      <Image source={require("./assets/icon.png")} style={styles.icon} />
      <Button title="Reload" onPress={() => reload()} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#fff",
  },
  icon: { width: 96, height: 96 },
});
