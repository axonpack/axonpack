import type { PreviewList } from '@axonpack/preview';
import { StyleSheet } from 'react-native';

import { InsetPadding } from '../../../../core/components/ui/inset-padding.ui';
import { themeStore, useThemeStore } from '../../../../core/stores/theme.store';

/**
 * The Preview tab: preview's own list, in the panel's colours. The React Native DevTools panel
 * passes `virtualized={false}`, since a FlatList there draws its first rows and stops.
 */
export function PreviewTab({
  List,
  virtualized = true,
}: {
  List: typeof PreviewList;
  virtualized?: boolean;
}) {
  const palette = useThemeStore(themeStore.getPalette);
  return (
    <List
      theme={palette}
      virtualized={virtualized}
      style={styles.list}
      // The list's own end padding is room for a floating tab bar, which the panel doesn't have.
      contentContainerStyle={styles.content}
      ListFooterComponent=<InsetPadding edge="bottom" />
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { paddingBottom: 16 },
});
