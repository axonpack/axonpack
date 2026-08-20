import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type GestureResponderEvent } from 'react-native';

import {
  STORED_VALUE_ICONS,
  STORED_VALUE_LABELS,
} from '../constants/value-type-icons.const';
import type { StorageEntry } from '../stores/storage.store';
import { formatSize } from '../../../core/utils/format-bytes.util';
import { storedValueColor } from '../utils/classify-value.util';
import { buildStorageCopyMenuItems } from '../utils/entry-menu-items.util';
import { previewLine } from '../utils/formatters.util';
import { findMatches, type Matcher } from '../../../core/utils/text-search.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { ContextMenu } from '../../../core/components/ui/context-menu.ui';
import { HighlightedText } from '../../../core/components/ui/highlighted-text.ui';

function EntryRowBase({
  entry,
  matcher,
  onPress,
}: {
  entry: StorageEntry;
  matcher: Matcher | null;

  onPress: (entry: StorageEntry) => void;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);

  const kindColor = storedValueColor(COLORS, entry.kind);
  const preview = previewLine(entry.text);

  function openMenu(event: GestureResponderEvent) {
    setMenuAnchor({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
  }

  return (
    <TouchableOpacity onPress={() => onPress(entry)} onLongPress={openMenu} style={styles.row}>
      <View style={styles.keyRow}>
        <MaterialIcons
          name={STORED_VALUE_ICONS[entry.kind]}
          size={14}
          color={kindColor}
          style={styles.kindIcon}
        />
        <HighlightedText
          text={entry.key}
          ranges={findMatches(entry.key, matcher)}
          style={styles.key}
          numberOfLines={1}
          selectable={false}
        />
        <Text style={styles.size}>{formatSize(entry.size)}</Text>
      </View>

      <View style={styles.valueRow}>
        <Text style={[styles.kindLabel, { color: kindColor }]}>
          {STORED_VALUE_LABELS[entry.kind]}
        </Text>
        {entry.error === undefined ? (
          <HighlightedText
            text={preview}
            ranges={findMatches(preview, matcher)}
            style={styles.value}
            numberOfLines={1}
            selectable={false}
          />
        ) : (
          <Text style={styles.error} numberOfLines={1}>
            {entry.error}
          </Text>
        )}
      </View>

      <ContextMenu
        anchor={menuAnchor}
        items={buildStorageCopyMenuItems(entry)}
        onClose={() => setMenuAnchor(null)}
      />
    </TouchableOpacity>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  row: {
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kindIcon: {
    width: 14,
  },
  key: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  size: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    // Lines the value up under the key rather than under the type glyph.
    paddingLeft: 20,
  },
  kindLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  value: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'monospace',
    color: COLORS.textSecondary,
  },
  error: {
    flex: 1,
    fontSize: 11,
    color: COLORS.error,
  },
}));

export const EntryRow = memo(
  EntryRowBase,
  (prev, next) =>
    // Compiled once per query upstream, so identity is a safe stand-in for the query itself.
    prev.matcher === next.matcher &&
    prev.onPress === next.onPress &&
    prev.entry.adapterId === next.entry.adapterId &&
    prev.entry.key === next.entry.key &&
    prev.entry.text === next.entry.text &&
    prev.entry.kind === next.entry.kind &&
    prev.entry.size === next.entry.size &&
    prev.entry.error === next.entry.error
);
