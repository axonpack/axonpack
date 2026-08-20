import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Text, View } from 'react-native';

import { useCrashDetailStyles } from './shared.styles';
import { MONOSPACE } from '../../../../core/constants/typography.const';
import { makeThemedStyles, useThemeColors } from '../../../../core/utils/themed-styles.util';
import type { CrashBreadcrumb, CrashRecord } from '../../stores/crash.store';
import { formatCrashTime } from '../../utils/format-crash-report.util';

function crumbColor(crumb: CrashBreadcrumb, error: string, warning: string, secondary: string) {
  if (crumb.level === 'error') return error;
  if (crumb.level === 'warn') return warning;
  return secondary;
}

export function BreadcrumbsTab({ record }: { record: CrashRecord }) {
  const styles = useStyles();
  const detailStyles = useCrashDetailStyles();
  const COLORS = useThemeColors();

  const crumbs = record.breadcrumbs ?? [];

  if (crumbs.length === 0) {
    return (
      <View style={detailStyles.section}>
        <Text style={detailStyles.emptyText}>No breadcrumbs were recorded</Text>
        <Text style={detailStyles.note}>
          Breadcrumbs replay the console and network entries leading up to the crash. They are off
          by default outside development, because that trail carries request URLs and whatever the
          app logged — enable them with `crash: {'{'} breadcrumbs: true {'}'}`.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {crumbs.map((crumb, index) => (
        <View key={`${crumb.at}-${index}`} style={styles.row}>
          <MaterialIcons
            name={crumb.category === 'network' ? 'swap-vert' : 'terminal'}
            size={13}
            color={crumbColor(crumb, COLORS.error, COLORS.warning, COLORS.textSecondary)}
          />
          <Text style={styles.time}>{formatCrashTime(crumb.at).slice(11)}</Text>
          <Text style={styles.message} numberOfLines={3} selectable>
            {crumb.message}
          </Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  time: {
    fontFamily: MONOSPACE,
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  message: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textPrimary,
  },
}));
