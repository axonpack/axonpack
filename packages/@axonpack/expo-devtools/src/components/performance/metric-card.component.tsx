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
  value: string;
  valueColor?: string;
  /** Shown under the value — used to say why a metric is unavailable rather than leaving a dash. */
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    gap: 4,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
  },
  hint: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});
