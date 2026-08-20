import { StyleSheet, TextInput, View } from 'react-native';

import { makeThemedStyles, useThemeColors } from '../../../../core/utils/themed-styles.util';

export function UrlBar({ url, onChangeUrl }: { url: string; onChangeUrl: (url: string) => void }) {
  const styles = useStyles();
  const COLORS = useThemeColors();
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

const useStyles = makeThemedStyles((COLORS) => ({
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
}));
