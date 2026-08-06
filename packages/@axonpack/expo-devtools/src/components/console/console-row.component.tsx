import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ConsoleArgCell } from './console-arg-cell.component';
import { COLORS } from '../../constants/colors.const';
import { CONSOLE_LEVEL_VISUALS } from '../../constants/console/console-levels.const';
import type { ConsoleLogEntry } from '../../stores/console/console-log.store';
import { CopyIconButton } from '../ui/copy-icon-button.ui';

/**
 * Memoized because every captured log replaces the store's array, which re-renders the list. Store
 * entries are immutable — a row's `entry` only gets a new identity when that row actually changed —
 * so a shallow compare keeps a burst of logging from re-rendering every mounted row (each of which
 * can hold a JSON tree and an `Intl` time format).
 */
export const ConsoleRow = memo(function ConsoleRow({ entry }: { entry: ConsoleLogEntry }) {
  const visual = CONSOLE_LEVEL_VISUALS[entry.level];

  return (
    <View style={[styles.row, visual.surface ? { backgroundColor: visual.surface } : null]}>
      {/* Each argument owns its own interaction — the row itself is deliberately not tappable, so
          a tap inside a JSON tree expands that node instead of being eaten by a parent touchable. */}
      <View style={styles.main}>
        {visual.icon ? (
          <MaterialIcons name={visual.icon} size={14} color={visual.color} style={styles.icon} />
        ) : (
          // Keeps an un-iconed log's text on the same left edge as every other row's.
          <View style={styles.icon} />
        )}
        <View style={styles.body}>
          {entry.parts.map((arg, index) => (
            <ConsoleArgCell
              key={`${entry.id}-${index}`}
              arg={arg}
              plainColor={entry.level === 'error' ? COLORS.error : undefined}
            />
          ))}
        </View>
      </View>

      <View style={styles.meta}>
        {entry.count > 1 && <Text style={styles.metaText}>×{entry.count}</Text>}
        <Text style={styles.metaText}>{new Date(entry.timestamp).toLocaleTimeString()}</Text>
        <CopyIconButton value={entry.text} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  // The hairline separator is the row's only border — argument cells carry no chrome of their own.
  row: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  icon: {
    width: 14,
    marginTop: 1,
  },
  // Arguments flow inline and wrap, rather than stacking — `console.log('user', {…})` reads as one
  // sentence the way it does in a browser console. An expanded tree still pushes the rest down.
  body: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    columnGap: 6,
    rowGap: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  metaText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
});
