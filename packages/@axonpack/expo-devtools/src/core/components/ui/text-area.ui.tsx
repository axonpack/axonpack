import { StyleSheet, TextInput, View, type TextStyle } from 'react-native';

import { MONOSPACE } from '../../constants/typography.const';
import { useRemoteSafeInput } from '../../services/use-remote-safe-input.service';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';

/**
 * A multiline editor. Per `INPUT_STYLES.md` the chrome lives on the wrapping view and the
 * `TextInput` stays bare (`padding: 0`), so this reads as one box rather than a box inside a box.
 */
export function TextArea({
  value,
  onChangeText,
  placeholder,
  minHeight = 100,
  bordered = false,
  style,
}: {
  value: string;
  onChangeText: (text: string) => void;

  placeholder?: string;
  minHeight?: number;
  bordered?: boolean;
  style?: TextStyle;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const { textProps, resetKey } = useRemoteSafeInput(value, onChangeText);

  return (
    <View style={[bordered && styles.box, { minHeight }]}>
      <TextInput
        key={resetKey}
        style={[styles.input, style]}
        {...textProps}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
      />
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  box: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 6,
    backgroundColor: COLORS.background,
  },
  input: {
    flex: 1,
    padding: 0,
    fontSize: 12,
    fontFamily: MONOSPACE,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
  },
}));
