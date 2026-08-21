import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CallSite } from './call-site.component';
import { ConsoleArgCell } from './console-arg-cell.component';
import { CopyIconButton } from '../../../core/components/ui/copy-icon-button.ui';
import { InfoBadge } from '../../../core/components/ui/info-badge.ui';
import { crashInspectionStore } from '../../../core/stores/crash-inspection.store';
import type { Matcher } from '../../../core/utils/text-search.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { CRASH_KIND_LABELS } from '../../crash/utils/format-crash-report.util';
import type { ConsoleLogEntry } from '../stores/console-log.store';
import { consolePromptStore } from '../stores/console-prompt.store';
import { formatConsoleSource, NATIVE_CONSOLE_SOURCE } from '../utils/formatters.util';
import { resolveRowVisual } from '../utils/row-visual.util';

function ConsoleRowBase({ entry, matcher }: { entry: ConsoleLogEntry; matcher: Matcher | null }) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const visual = resolveRowVisual(entry, COLORS);
  const recallable = entry.level === 'input';
  const crashId = entry.crashId;

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
              onOpenReport={
                crashId === undefined ? undefined : () => crashInspectionStore.open(crashId)
              }
            />
          ))}
          {entry.crashKind && (
            // The same two chips the Crash tab's own row carries, so a crash reads the same in
            // either place: what kind it was, and how much of a trail came with it.
            <View style={styles.crashBadges}>
              <InfoBadge label={CRASH_KIND_LABELS[entry.crashKind]} />
              {entry.crashBreadcrumbs ? (
                <InfoBadge icon="timeline" label={`${entry.crashBreadcrumbs}`} />
              ) : null}
            </View>
          )}
        </View>
      </View>

      <View style={styles.meta}>
        {entry.callSite?.length ? <CallSite id={entry.id} frames={entry.callSite} /> : null}
        {entry.source && entry.source !== NATIVE_CONSOLE_SOURCE && (
          <Text style={styles.metaText}>{formatConsoleSource(entry.source)}</Text>
        )}
        {entry.count > 1 && <Text style={styles.metaText}>×{entry.count}</Text>}
        <Text style={styles.metaText}>{new Date(entry.timestamp).toLocaleTimeString()}</Text>
        <CopyIconButton value={entry.text} />
      </View>
    </View>
  );

  // The whole row, not only the message inside it. `ErrorArgCell` puts the press on the message when
  // there is a report, which left the icon, the chips, the location and every gap between them dead
  // — a row that opens something should open it wherever it is tapped.
  if (crashId !== undefined && !recallable) {
    return (
      <TouchableOpacity activeOpacity={0.6} onPress={() => crashInspectionStore.open(crashId)}>
        {content}
      </TouchableOpacity>
    );
  }

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
    prev.entry.source === next.entry.source &&
    prev.entry.crashId === next.entry.crashId &&
    prev.entry.crashKind === next.entry.crashKind &&
    prev.entry.crashBreadcrumbs === next.entry.crashBreadcrumbs &&
    prev.entry.callSite === next.entry.callSite
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
  crashBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    paddingTop: 2,
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
