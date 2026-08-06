import { StyleSheet, Text, View } from 'react-native';

/**
 * The `{;}` JSON mark, drawn as monospace text.
 *
 * MaterialIcons has no such glyph — the one that matches is `code-json` in
 * MaterialCommunityIcons, whose font is 1.2MB against the 348KB set already bundled. That is far
 * too much weight for a single icon in a library (see the icon-font note in CLAUDE.md), and
 * unlike the lettering glyphs this replaced, `{;}` is a symbol rather than a word, so drawing it
 * as text still reads as an icon.
 */
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
    fontFamily: 'monospace',
    fontWeight: '700',
    // Pulls the three characters in so they occupy roughly the same box as a real icon.
    letterSpacing: -1,
    includeFontPadding: false,
    textAlign: 'center',
  },
});
