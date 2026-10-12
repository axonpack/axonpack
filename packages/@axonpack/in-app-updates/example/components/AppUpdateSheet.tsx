import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { UpdateModalProps } from "@axonpack/in-app-updates";

// An app's own modal. It uses its own look and its own buttons, and only takes the state and the
// handlers from the library.
const Button = ({
  label,
  onPress,
  primary,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    style={[styles.button, primary && styles.primary]}
  >
    <Text style={[styles.buttonText, primary && styles.primaryText]}>
      {label}
    </Text>
  </Pressable>
);

export function AppUpdateSheet({
  visible,
  isForced,
  canSkip,
  currentVersion,
  latestVersion,
  releaseNotes,
  onUpdate,
  onDismiss,
  onSkip,
}: UpdateModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={isForced ? undefined : onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>
            {isForced ? "Please update to continue" : "A new version is ready"}
          </Text>
          <Text style={styles.versions}>
            {currentVersion} → {latestVersion}
          </Text>
          {releaseNotes ? (
            <Text style={styles.notes}>{releaseNotes}</Text>
          ) : null}
          <Button primary label="Get the update" onPress={onUpdate} />
          {!isForced && <Button label="Remind me later" onPress={onDismiss} />}
          {canSkip && <Button label="Skip this version" onPress={onSkip} />}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  sheet: {
    backgroundColor: "#fffaf0",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    gap: 10,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#d6cdb8",
    marginBottom: 8,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#3b2f1a" },
  versions: { fontSize: 15, color: "#8a7650", fontWeight: "600" },
  notes: { fontSize: 14, lineHeight: 20, color: "#5a4a2c", marginBottom: 6 },
  button: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: "#b45309" },
  buttonText: { fontSize: 16, fontWeight: "700", color: "#b45309" },
  primaryText: { color: "#fff" },
});
