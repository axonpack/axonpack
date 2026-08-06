import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ConsoleArgCell } from './console-arg-cell.component';
import { COLORS } from '../../constants/colors.const';
import { CONSOLE_LEVEL_VISUALS } from '../../constants/console/console-levels.const';
import { consolePromptStore } from '../../stores/console/console-prompt.store';
import type { ConsoleLogEntry } from '../../stores/console/console-log.store';
import { formatConsoleSource, NATIVE_CONSOLE_SOURCE } from '../../utils/console/formatters.util';
import { CopyIconButton } from '../ui/copy-icon-button.ui';

export const ConsoleRow = memo(function ConsoleRow({ entry }: { entry: ConsoleLogEntry }) {
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
});

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
  // One argument per line. Chrome flows them inline, but a phone's width doesn't hold a string and
  // an object side by side often enough for that to be worth the wrapping it causes.
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
