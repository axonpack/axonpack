import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { COLORS } from '../../../constants/colors.const';

export function SendButton({ sending, onPress }: { sending: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} disabled={sending}>
      {sending ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <Text style={styles.text}>Send</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.textPrimary,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
