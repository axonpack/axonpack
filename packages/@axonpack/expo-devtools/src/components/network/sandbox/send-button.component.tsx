import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';

import { TOUCH_TARGET } from '../../../constants/metrics.const';
import { makeThemedStyles } from '../../../utils/themed-styles.util';

export function SendButton({ sending, onPress }: { sending: boolean; onPress: () => void }) {
  const styles = useStyles();
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

const useStyles = makeThemedStyles((COLORS) => ({
  button: {
    backgroundColor: COLORS.textPrimary,
    borderRadius: 6,
    paddingHorizontal: 16,
    minHeight: TOUCH_TARGET.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
}));
