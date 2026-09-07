import type { PrettyPrintTheme } from '@axonpack/react-pretty-print';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * A titled, bordered block. The horizontal `ScrollView` is the part the package can't provide:
 * long code lines have to scroll, and only the consumer can mount a scroller.
 */
export function Panel({
  title,
  theme,
  scrollHorizontal = false,
  children,
}: {
  title: string;
  theme: PrettyPrintTheme;
  scrollHorizontal?: boolean;
  children: ReactNode;
}) {
  const border = { borderColor: theme.punctuation };
  const ink = { color: theme.text };

  return (
    <View style={styles.section}>
      <Text style={[styles.title, ink]}>{title}</Text>
      <View style={[styles.card, border]}>
        {scrollHorizontal ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  title: { fontSize: 13, fontWeight: '600', marginBottom: 6, opacity: 0.8 },
  card: { padding: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
});
