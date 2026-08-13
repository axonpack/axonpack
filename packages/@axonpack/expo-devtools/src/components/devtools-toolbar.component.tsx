import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { makeThemedStyles, useThemeColors } from '../utils/themed-styles.util';
import { IconButton } from './ui/icon-button.ui';
import { RecordToggleButton } from './ui/record-toggle-button.ui';

export function DevtoolsToolbar({
  paused,
  onTogglePaused,
  onClear,
  clearLabel,
  children,
  trailing,
}: {
  paused: boolean;
  onTogglePaused: () => void;
  onClear: () => void;

  clearLabel: string;

  children?: ReactNode;

  trailing?: ReactNode;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  return (
    <View style={styles.header}>
      <View style={styles.actions}>
        <RecordToggleButton paused={paused} onToggle={onTogglePaused} />
        <IconButton
          name="block"
          color={COLORS.textSecondary}
          onPress={onClear}
          label={clearLabel}
        />
        {children}
      </View>
      {trailing}
    </View>
  );
}

export function ToolbarDivider() {
  const styles = useStyles();
  return <View style={styles.divider} />;
}

const useStyles = makeThemedStyles((COLORS) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    backgroundColor: COLORS.toolbarOverlay,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  divider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
}));
