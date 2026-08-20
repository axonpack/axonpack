import { StyleSheet, Text, View } from 'react-native';

import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';

export function MetricCard({
  label,
  value,
  valueColor,
  hint,
  children,
}: {
  label: string;

  value?: string;

  valueColor?: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  const COLORS = useThemeColors();
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      {value !== undefined ? (
        <Text style={[styles.value, { color: valueColor ?? COLORS.textPrimary }]}>{value}</Text>
      ) : null}
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
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
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
}));
