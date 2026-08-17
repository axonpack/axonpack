import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { HIT_SLOP, TOUCH_TARGET } from '../../constants/metrics.const';
import type { SearchModes } from '../../utils/text-search.util';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';

// MaterialIcons has no match-case/whole-word/regex glyph, so these borrow VS Code's lettering.
const MODE_BUTTONS: {
  key: keyof SearchModes;
  glyph: string;
  label: string;
  underline?: boolean;
}[] = [
  { key: 'matchCase', glyph: 'Aa', label: 'Match case' },
  { key: 'wholeWord', glyph: 'ab', label: 'Match whole word', underline: true },
  { key: 'regex', glyph: '.*', label: 'Use regular expression' },
];

export function SearchInput({
  value,
  onChangeText,
  modes,
  onModesChange,
  placeholder = 'Search',
  invalid = false,
  trailing,
}: {
  value: string;
  onChangeText: (next: string) => void;
  modes: SearchModes;
  onModesChange: (next: SearchModes) => void;
  placeholder?: string;
  invalid?: boolean;
  trailing?: ReactNode;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();

  return (
    <View style={[styles.searchRow, invalid && styles.searchRowInvalid]}>
      <MaterialIcons name="search" size={16} color={COLORS.textSecondary} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          hitSlop={HIT_SLOP.dense}
          accessibilityLabel="Clear search"
          style={styles.searchClear}>
          <MaterialIcons name="close" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
      )}
      {MODE_BUTTONS.map((mode) => (
        <TouchableOpacity
          key={mode.key}
          onPress={() => onModesChange({ ...modes, [mode.key]: !modes[mode.key] })}
          hitSlop={HIT_SLOP.dense}
          accessibilityLabel={mode.label}
          accessibilityState={{ selected: modes[mode.key] }}
          style={[styles.modeButton, modes[mode.key] && styles.modeButtonActive]}>
          <Text
            style={[
              styles.modeGlyph,
              mode.underline && styles.modeGlyphUnderlined,
              modes[mode.key] && styles.modeGlyphActive,
            ]}>
            {mode.glyph}
          </Text>
        </TouchableOpacity>
      ))}
      {trailing}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  searchRow: {
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
  searchRowInvalid: {
    borderColor: COLORS.error,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    padding: 0, // RN adds default vertical padding to TextInput; zero it so it aligns with the row
  },
  searchClear: {
    width: TOUCH_TARGET.dense,
    height: TOUCH_TARGET.dense,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButton: {
    width: TOUCH_TARGET.dense,
    height: TOUCH_TARGET.dense,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  modeButtonActive: {
    backgroundColor: COLORS.toolbarOverlay,
  },
  modeGlyph: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  modeGlyphUnderlined: {
    textDecorationLine: 'underline',
  },
  modeGlyphActive: {
    color: COLORS.accent,
  },
}));
