import { StyleSheet, Text, View } from 'react-native';
import { MONOSPACE } from '../../constants/typography.const';

export function JsonIcon({ size = 14, color }: { size?: number; color: string }) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Text style={[styles.glyph, { color, fontSize: size * 0.78 }]} numberOfLines={1}>
        {'{;}'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontFamily: MONOSPACE,
    fontWeight: '700',
    letterSpacing: -1,
    includeFontPadding: false,
    textAlign: 'center',
  },
});
