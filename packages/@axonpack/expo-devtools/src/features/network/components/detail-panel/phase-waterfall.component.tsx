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
};

export function PhaseWaterfall({ phases }: { phases: NetworkPhases }) {
  const rowStyles = useRowStyles();
  const styles = useStyles();
  const COLORS = useThemeColors();

  const measured = layOutPhases(phases);

  return (
    <View style={rowStyles.section}>
      <View style={styles.badges}>
        <InfoBadge label={`Measured by ${MEASURED_BY_LABELS[phases.measuredBy]}`} />
        {phases.protocol !== undefined && <InfoBadge label={phases.protocol} />}
        {phases.reusedConnection === true && <InfoBadge icon="link" label="Connection reused" />}
      </View>

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
