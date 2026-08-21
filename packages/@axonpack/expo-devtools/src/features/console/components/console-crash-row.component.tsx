import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CallSite } from './call-site.component';
import { CopyIconButton } from '../../../core/components/ui/copy-icon-button.ui';
import { InfoBadge } from '../../../core/components/ui/info-badge.ui';
import { MONOSPACE } from '../../../core/constants/typography.const';
import { crashInspectionStore } from '../../../core/stores/crash-inspection.store';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { CRASH_KIND_LABELS } from '../../crash/utils/format-crash-report.util';
import type { ConsoleLogEntry } from '../stores/console-log.store';
import { resolveRowVisual } from '../utils/row-visual.util';

/**
 * A crash in the console stream, drawn as a card rather than as a line of output.
 *
 * The generic row is built for one line of text with its arguments beside it, which is the wrong
 * shape for something that has a kind, a trail, an origin and a report behind it — squeezed into a
 * log line, every one of those read as incidental. The alignment is deliberately the Crash tab's own:
 * glyph on the left, name over message, badges underneath with the time pushed to the end. The same
 * event should not need re-reading because it is in a different tab.
 *
 * Inset, unlike every other row, because a card is what says this is not output the app printed.
 */
function ConsoleCrashRowBase({ entry }: { entry: ConsoleLogEntry }) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const visual = resolveRowVisual(entry, COLORS);
  const crashId = entry.crashId;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      // The whole card: the glyph, the badges and the gaps between them are not dead space.
      onPress={crashId === undefined ? undefined : () => crashInspectionStore.open(crashId)}
      style={[styles.card, { borderLeftColor: visual.color }]}>
      {visual.icon ? (
        <MaterialIcons name={visual.icon} size={16} color={visual.color} style={styles.glyph} />
      ) : null}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {entry.crashName ?? 'Crash'}
          </Text>
          {entry.count > 1 && <Text style={styles.count}>×{entry.count}</Text>}
          <CopyIconButton value={entry.text} />
        </View>

        <Text style={styles.message} numberOfLines={3}>
          {entry.crashMessage || '(no message)'}
        </Text>

        <View style={styles.badges}>
          {entry.crashKind && <InfoBadge label={CRASH_KIND_LABELS[entry.crashKind]} />}
          {/* The one row in this stream that did not happen during it: read back off disk at
              startup, from a run the process did not survive. */}
          {entry.crashFromPreviousLaunch && <InfoBadge icon="history" label="Previous launch" />}
          {entry.crashBreadcrumbs ? (
            <InfoBadge icon="timeline" label={`${entry.crashBreadcrumbs}`} />
          ) : null}
          {entry.callSite?.length ? <CallSite id={entry.id} frames={entry.callSite} /> : null}
          <Text style={styles.time}>{new Date(entry.timestamp).toLocaleTimeString()}</Text>
        </View>

        {crashId !== undefined && (
          <View style={styles.open}>
            <Text style={[styles.openLabel, { color: visual.color }]}>Open report</Text>
            <MaterialIcons name="chevron-right" size={15} color={visual.color} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export const ConsoleCrashRow = memo(
  ConsoleCrashRowBase,
  (prev, next) =>
    prev.entry.id === next.entry.id &&
    prev.entry.count === next.entry.count &&
    prev.entry.timestamp === next.entry.timestamp &&
    prev.entry.crashId === next.entry.crashId &&
    prev.entry.crashKind === next.entry.crashKind &&
    prev.entry.crashName === next.entry.crashName &&
    prev.entry.crashMessage === next.entry.crashMessage &&
    prev.entry.crashBreadcrumbs === next.entry.crashBreadcrumbs &&
    prev.entry.crashFromPreviousLaunch === next.entry.crashFromPreviousLaunch &&
    prev.entry.callSite === next.entry.callSite
);

const useStyles = makeThemedStyles((COLORS) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 8,
    marginVertical: 4,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    backgroundColor: COLORS.errorSurface,
  },
  glyph: {
    marginTop: 2,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  count: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  message: {
    fontFamily: MONOSPACE,
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textSecondary,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 3,
  },
  time: {
    marginLeft: 'auto',
    fontFamily: MONOSPACE,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  open: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  openLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
}));
