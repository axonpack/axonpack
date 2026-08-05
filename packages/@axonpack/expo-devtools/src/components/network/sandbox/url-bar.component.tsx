import { StyleSheet, TextInput, View } from 'react-native';

import { COLORS } from '../../../constants/colors.const';

export function UrlBar({ url, onChangeUrl }: { url: string; onChangeUrl: (url: string) => void }) {
  return (
    <View style={styles.row}>
      <TextInput
        style={styles.input}
        value={url}
        onChangeText={onChangeUrl}
        placeholder="https://api.example.com/path"
        placeholderTextColor={COLORS.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  input: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: COLORS.textPrimary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
