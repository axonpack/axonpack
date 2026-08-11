import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';

export function MetricCard({
  label,
  value,
  valueColor = COLORS.textPrimary,
  hint,
  children,
}: {
  label: string;
  /** Omitted when the value is rendered by a child, e.g. an animated metric. */
  value?: string;
  valueColor?: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      {value !== undefined ? (
        <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      ) : null}
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Softer radius and more air than the surrounding chrome: these are the tab's headline figures, and a
  // tile that reads as a panel row buries them.
  card: {
    flex: 1,
    minWidth: 148,
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    // Tabular figures so a changing number doesn't shuffle its own width twice a second.
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});
