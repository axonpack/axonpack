import { StyleSheet } from 'react-native';

import { InsetPadding } from '../../../core/components/ui/inset-padding.ui';
import { themeStore, useThemeStore } from '../../../core/stores/theme.store';
import { previewStore, usePreviewStore } from '../stores/preview.store';

/**
 * The Preview tab: preview's own list, in the panel's colours. The React Native DevTools tab passes
 * `virtualized={false}`, since a FlatList there draws its first rows and stops.
 */
export function PreviewView({ virtualized = true }: { virtualized?: boolean }) {
  const preview = usePreviewStore(previewStore.getModule);
  const palette = useThemeStore(themeStore.getPalette);
  if (!preview) return null;
  return (
    <preview.PreviewList
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
