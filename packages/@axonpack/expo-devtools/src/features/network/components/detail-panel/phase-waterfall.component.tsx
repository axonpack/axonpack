import { Text, View } from 'react-native';

import { useRowStyles } from './shared.styles';
import { InfoBadge } from '../../../../core/components/ui/info-badge.ui';
import { makeThemedStyles, useThemeColors } from '../../../../core/utils/themed-styles.util';
import type { NetworkPhases } from '../../stores/network-log.store';

/** In the order they happen, which is the only order a waterfall can be read in. */
const PHASES: { key: keyof NetworkPhases; label: string }[] = [
  { key: 'queuedMs', label: 'Queued' },
  { key: 'dnsMs', label: 'DNS' },
  { key: 'tcpMs', label: 'TCP' },
  { key: 'tlsMs', label: 'TLS' },
  { key: 'sendMs', label: 'Sending' },
  { key: 'waitMs', label: 'Waiting' },
  { key: 'downloadMs', label: 'Downloading' },
];

const MEASURED_BY_LABELS: Record<NetworkPhases['measuredBy'], string> = {
  urlsession: 'URLSession',
  okhttp: 'OkHttp',
};

export function PhaseWaterfall({ phases }: { phases: NetworkPhases }) {
  const rowStyles = useRowStyles();
  const styles = useStyles();
  const COLORS = useThemeColors();

  const measured = PHASES.map((phase) => ({
    ...phase,
    value: phases[phase.key] as number | undefined,
  })).filter((phase) => phase.value !== undefined);

  // The bars are relative to the longest phase rather than to the total: the interesting phase is
  // usually a handshake of a few milliseconds beside a wait of hundreds, and scaling to the total
  // leaves it invisible.
  const longest = measured.reduce((max, phase) => Math.max(max, phase.value ?? 0), 0);

  return (
    <View style={rowStyles.section}>
      <View style={styles.badges}>
        <InfoBadge label={`Measured by ${MEASURED_BY_LABELS[phases.measuredBy]}`} />
        {phases.protocol !== undefined && <InfoBadge label={phases.protocol} />}
        {phases.reusedConnection === true && <InfoBadge icon="link" label="Connection reused" />}
      </View>

      {measured.map((phase) => (
        <View key={phase.key} style={styles.row}>
          <Text style={styles.label} numberOfLines={1}>
            {phase.label}
          </Text>
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                {
                  backgroundColor: COLORS.accent,
                  width: longest > 0 ? `${Math.max(2, ((phase.value ?? 0) / longest) * 100)}%` : 2,
                },
              ]}
            />
          </View>
          <Text style={styles.value}>{`${phase.value} ms`}</Text>
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
  label: {
    width: 84,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.keyAccent,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.toolbarBackground,
    overflow: 'hidden',
  },
  bar: {
    height: 8,
    borderRadius: 4,
  },
  value: {
    width: 66,
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
