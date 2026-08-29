import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { HIT_SLOP, TOUCH_TARGET } from '../../constants/metrics.const';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';

/**
 * One line of text with a heading over it — the search box's chrome without the search box's modes,
 * for the fields that ask for a number or an expression rather than for something to look for. Same
 * bordered row, same bare `TextInput` inside it, so a filter panel with both in it reads as one panel.
 */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  invalid = false,
  numeric = false,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  /** Says the text cannot be read, without dropping what was typed. */
  invalid?: boolean;
  numeric?: boolean;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.row, invalid && styles.rowInvalid]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSecondary}
          // `decimal-pad` rather than `number-pad`: a size takes `1.5mb` and a duration `1.5s`, and
          // the letters come from the keyboard's own toggle on both platforms.
          keyboardType={numeric ? 'decimal-pad' : 'default'}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={label}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            hitSlop={HIT_SLOP.dense}
            accessibilityLabel={`Clear ${label}`}
            style={styles.clear}>
            <MaterialIcons name="close" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  field: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    // Height, not padding: the row is the tap target that focuses the field.
    minHeight: TOUCH_TARGET.min,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 6,
  },
  rowInvalid: {
    borderColor: COLORS.error,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    padding: 0, // RN adds default vertical padding to TextInput; zero it so it aligns with the row
  },
  clear: {
    width: TOUCH_TARGET.dense,
    height: TOUCH_TARGET.dense,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
