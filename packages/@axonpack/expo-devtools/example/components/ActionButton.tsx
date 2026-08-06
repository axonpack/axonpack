import { StyleSheet, Text, TouchableOpacity } from 'react-native';

/** Compact pill, so a screen with two dozen demo actions still fits in a couple of scrolls. */
export function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e6f4fe',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#0a7ea4',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0a7ea4',
  },
});
