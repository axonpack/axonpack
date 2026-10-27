import { PreviewList } from "@axonpack/preview";
import { StyleSheet } from "react-native";

export default function PreviewsScreen() {
  return <PreviewList style={styles.list} />;
}

const styles = StyleSheet.create({ list: { flex: 1 } });
