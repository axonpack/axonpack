import type { PrettyPrintTheme } from '@axonpack/react-pretty-print/themes';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { MONOSPACE } from '../fonts';

/**
 * A horizontal strip of every palette. Each chip is painted in the palette it selects, so the strip
 * previews the whole set — which is the point on a phone, where a list of 130 names tells you
 * nothing about what you are choosing.
 */
export function ThemePicker({
  palettes,
  selected,
  onSelect,
}: {
  palettes: [string, PrettyPrintTheme][];
  selected: string;
  onSelect: (name: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}>
      {palettes.map(([name, palette]) => (
        <Pressable
          key={name}
          onPress={() => onSelect(name)}
          style={[
            styles.chip,
            { backgroundColor: palette.background, borderColor: palette.punctuation },
            name === selected && { borderColor: palette.key, borderWidth: 2 },
          ]}>
          <Text style={[styles.label, { color: palette.text }]} numberOfLines={1}>
            {name
              .replace(/_THEME$/, '')
              .toLowerCase()
              .replace(/_/g, ' ')}
          </Text>
          <Text style={[styles.sample, { color: palette.key }]} numberOfLines={1}>
            {'key: '}
            <Text style={{ color: palette.string }}>&quot;value&quot;</Text>
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: { gap: 8, paddingBottom: 4 },
  chip: {
    width: 132,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  label: { fontSize: 11 },
  sample: { fontSize: 11, fontFamily: MONOSPACE },
});
