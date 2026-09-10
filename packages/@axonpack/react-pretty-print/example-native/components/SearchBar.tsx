import type { SearchQuery } from '@axonpack/react-pretty-print';
import type { PrettyPrintTheme } from '@axonpack/react-pretty-print/themes';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MONOSPACE } from '../fonts';

/** The three flags `buildMatcher` reads, with the labels editors conventionally give them. */
const MODES: [keyof Omit<SearchQuery, 'text'>, string][] = [
  ['matchCase', 'Aa'],
  ['wholeWord', 'ab|'],
  ['regex', '.*'],
];

export function SearchBar({
  query,
  invalid,
  theme,
  onChange,
}: {
  query: SearchQuery;
  /** True when the pattern will not compile — the package treats that as no search. */
  invalid: boolean;
  theme: PrettyPrintTheme;
  onChange: (query: SearchQuery) => void;
}) {
  return (
    <View style={[styles.row, { borderColor: invalid ? theme.string : theme.punctuation }]}>
      <Text style={[styles.glyph, { color: theme.punctuation, fontFamily: MONOSPACE }]}>
        {query.regex ? '/' : '⌕'}
      </Text>
      <TextInput
        style={[styles.input, { color: theme.text, fontFamily: MONOSPACE }]}
        value={query.text}
        onChangeText={(text) => onChange({ ...query, text })}
        placeholder={query.regex ? 'pattern' : 'highlight…'}
        placeholderTextColor={theme.punctuation}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
      />
      {query.text.length > 0 && (
        <Pressable
          onPress={() => onChange({ ...query, text: '' })}
          hitSlop={6}
          style={[styles.chip, { borderColor: theme.punctuation }]}>
          <Text style={[styles.chipText, { color: theme.punctuation, fontFamily: MONOSPACE }]}>
            ×
          </Text>
        </Pressable>
      )}
      {MODES.map(([mode, label]) => {
        const active = query[mode];
        return (
          <Pressable
            key={mode}
            onPress={() => onChange({ ...query, [mode]: !active })}
            hitSlop={6}
            style={[
              styles.chip,
              {
                borderColor: active ? theme.key : theme.punctuation,
                backgroundColor: active ? theme.matchHighlight : 'transparent',
              },
            ]}>
            <Text
              style={[
                styles.chipText,
                { color: active ? theme.key : theme.punctuation, fontFamily: MONOSPACE },
              ]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    // Height rather than padding: the row is the tap target that focuses the field, so it takes the
    // platform floor rather than a padding that happened to look right.
    minHeight: 44,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
  },
  glyph: { fontSize: 13 },
  input: {
    flex: 1,
    fontSize: 13,
    // React Native adds default vertical padding to a TextInput; zero it so it sits on the row.
    padding: 0,
  },
  // Square and centred rather than glyph-sized, so a toggle doesn't stretch the field. The row's
  // own height carries the 44 floor, so these take the dense size plus the slop above.
  chip: {
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 11 },
});
