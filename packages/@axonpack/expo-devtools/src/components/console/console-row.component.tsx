import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ConsoleArgCell } from './console-arg-cell.component';
import { COLORS } from '../../constants/colors.const';
import { CONSOLE_LEVEL_VISUALS } from '../../constants/console/console-levels.const';
import type { ConsoleLogEntry } from '../../stores/console/console-log.store';
import { consolePromptStore } from '../../stores/console/console-prompt.store';
import { formatConsoleSource, NATIVE_CONSOLE_SOURCE } from '../../utils/console/formatters.util';
import { CopyIconButton } from '../ui/copy-icon-button.ui';

function ConsoleRowBase({ entry }: { entry: ConsoleLogEntry }) {
  const visual = CONSOLE_LEVEL_VISUALS[entry.level];
  // Only the REPL's own echo is replayable — there's no source text behind a captured log.
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
              // A `selectable` Text swallows taps on iOS, which would eat the recall press.
              selectable={!recallable}
            />
          ))}
        </View>
      </View>

      <View style={styles.meta}>
        {/* Only page output is labelled — tagging every native row would be noise in the common
            case where there's no WebView at all. */}
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

/**
 * Unlike the performance rows, a console entry really is patched in place of its predecessor: `add`
 * collapses a repeat by replacing the newest entry with a higher `count` and a newer `timestamp`, and a
 * REPL result replaces the pending row's `parts` and `text`. Both have to re-render, which is why this
 * lists fields rather than trusting the id.
 *
 * `entry` is the only prop, and every field of it is read — `text` by the copy button and by recall — so
 * anything added to `ConsoleLogEntry` that the row uses needs a line here too.
 */
export const ConsoleRow = memo(
  ConsoleRowBase,
  (prev, next) =>
    prev.entry.id === next.entry.id &&
    prev.entry.count === next.entry.count &&
    prev.entry.timestamp === next.entry.timestamp &&
    prev.entry.parts === next.entry.parts &&
    prev.entry.text === next.entry.text &&
    prev.entry.level === next.entry.level &&
    prev.entry.source === next.entry.source
);

const styles = StyleSheet.create({
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
});
