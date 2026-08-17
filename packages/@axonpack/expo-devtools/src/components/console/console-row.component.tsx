import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ConsoleArgCell } from './console-arg-cell.component';
import { consoleLevelVisuals } from '../../constants/console/console-levels.const';
import type { ConsoleLogEntry } from '../../stores/console/console-log.store';
import { consolePromptStore } from '../../stores/console/console-prompt.store';
import { formatConsoleSource, NATIVE_CONSOLE_SOURCE } from '../../utils/console/formatters.util';
import type { Matcher } from '../../utils/text-search.util';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';
import { CopyIconButton } from '../ui/copy-icon-button.ui';

function ConsoleRowBase({ entry, matcher }: { entry: ConsoleLogEntry; matcher: Matcher | null }) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const visual = consoleLevelVisuals(COLORS)[entry.level];
  const recallable = entry.level === 'input';

  const content = (
    <View style={[styles.row, visual.surface ? { backgroundColor: visual.surface } : null]}>
      <View style={styles.main}>
        {visual.icon ? (
          <MaterialIcons name={visual.icon} size={14} color={visual.color} style={styles.icon} />
        ) : (
          <View style={styles.icon} />
        )}
        <View style={styles.body}>
          {entry.parts.map((arg, index) => (
            <ConsoleArgCell
              key={`${entry.id}-${index}`}
              arg={arg}
              plainColor={entry.level === 'error' ? COLORS.error : undefined}
              selectable={!recallable}
              matcher={matcher}
            />
          ))}
        </View>
      </View>

      <View style={styles.meta}>
        {entry.source && entry.source !== NATIVE_CONSOLE_SOURCE && (
          <Text style={styles.metaText}>{formatConsoleSource(entry.source)}</Text>
        )}
        {entry.count > 1 && <Text style={styles.metaText}>×{entry.count}</Text>}
        <Text style={styles.metaText}>{new Date(entry.timestamp).toLocaleTimeString()}</Text>
        <CopyIconButton value={entry.text} />
      </View>
    </View>
  );

  if (!recallable) return content;

  return (
    <TouchableOpacity activeOpacity={0.6} onPress={() => consolePromptStore.recall(entry.text)}>
      {content}
    </TouchableOpacity>
  );
}

export const ConsoleRow = memo(
  ConsoleRowBase,
  (prev, next) =>
    // Compiled once per query upstream, so identity is a safe stand-in for the query itself.
    prev.matcher === next.matcher &&
    prev.entry.id === next.entry.id &&
    prev.entry.count === next.entry.count &&
    prev.entry.timestamp === next.entry.timestamp &&
    prev.entry.parts === next.entry.parts &&
    prev.entry.text === next.entry.text &&
    prev.entry.level === next.entry.level &&
    prev.entry.source === next.entry.source
);

const useStyles = makeThemedStyles((COLORS) => ({
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
  body: {
    flex: 1,
    gap: 2,
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
}));
