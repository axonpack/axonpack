import { Text, View } from 'react-native';

import { useRowStyles } from './shared.styles';
import { InfoBadge } from '../../../../core/components/ui/info-badge.ui';
import { formatDuration } from '../../../../core/utils/format-duration.util';
import { makeThemedStyles, useThemeColors } from '../../../../core/utils/themed-styles.util';
import type { NetworkPhases } from '../../stores/network-log.store';
import { layOutPhases } from '../../utils/phase-layout.util';

const MEASURED_BY_LABELS: Record<NetworkPhases['measuredBy'], string> = {
  urlsession: 'URLSession',
  okhttp: 'OkHttp',
  /** The page's own engine, which measures more of a request than either stack above. */
  webview: 'the page',
};

export function PhaseWaterfall({
  phases,
  appDurationMs,
}: {
  phases: NetworkPhases;
  /** What the patches timed, used only when the platform sent no total of its own. */
  appDurationMs?: number;
}) {
  const rowStyles = useRowStyles();
  const styles = useStyles();
  const COLORS = useThemeColors();

  const measured = layOutPhases(phases, appDurationMs);
  const total = phases.totalMs ?? appDurationMs;

  return (
    <View style={rowStyles.section}>
      <View style={styles.badges}>
        <InfoBadge label={`Measured by ${MEASURED_BY_LABELS[phases.measuredBy]}`} />
        {phases.protocol !== undefined && <InfoBadge label={phases.protocol} />}
        {phases.reusedConnection === true && <InfoBadge icon="link" label="Connection reused" />}
      </View>

      {total !== undefined && (
        <View style={styles.row}>
          <View style={styles.labelGroup}>
            <Text style={styles.label} numberOfLines={1}>
              Total
            </Text>
            {phases.totalMs === undefined && (
              // Said out loud, because it is measured from a different moment than the phases are: the
              // call leaving JavaScript rather than the stack picking the request up.
              <Text style={styles.offset} numberOfLines={1}>
                app clock
              </Text>
            )}
          </View>
          {/* The whole track, so the phases below can be read as parts of it. */}
          <View style={styles.track}>
            <View
              style={[styles.bar, styles.totalBar, { backgroundColor: COLORS.textSecondary }]}
            />
          </View>
          <Text style={styles.value}>{formatDuration(total)}</Text>
        </View>
      )}

      {measured.map((phase) => (
        <View key={phase.key} style={styles.row}>
          <View style={styles.labelGroup}>
            <Text style={styles.label} numberOfLines={1}>
              {phase.label}
            </Text>
            {phase.offsetMs > 0 && (
              <Text style={styles.offset} numberOfLines={1}>
                {`+${formatDuration(phase.offsetMs)}`}
              </Text>
            )}
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                {
                  backgroundColor: COLORS.accent,
                  left: `${phase.offsetPercent}%`,
                  width: `${phase.widthPercent}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.value}>{formatDuration(phase.value)}</Text>
        </View>
      ))}

      {phases.reusedConnection === true && (
        <Text style={styles.note} selectable>
          An already-open socket carried this request, so it has no DNS, connection or TLS phase to
          report — that is a connection saved, not a measurement missed.
        </Text>
      )}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  labelGroup: {
    width: 92,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.keyAccent,
  },

  offset: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },

  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.toolbarBackground,
    overflow: 'hidden',
  },
  // Muted and full width: it is the scale the rest are measured against, not a phase of its own.
  totalBar: {
    left: 0,
    width: '100%',
    opacity: 0.45,
  },
  bar: {
    position: 'absolute',
    height: '100%',
    minWidth: 2,
  },
  value: {
    width: 78,
    textAlign: 'right',
    fontSize: 12,
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  note: {
    marginTop: 8,
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
}));
