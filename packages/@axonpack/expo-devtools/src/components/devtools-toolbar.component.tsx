import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { makeThemedStyles, useThemeColors } from '../utils/themed-styles.util';
import { IconButton } from './ui/icon-button.ui';
import { RecordToggleButton } from './ui/record-toggle-button.ui';

/**
 * `paused`/`onClear` are optional because the Storage tab has neither: it pulls on demand rather
 * than recording a stream, and its "clear" would mean wiping the user's storage rather than
 * dropping a log — so it passes a Refresh button as `leading` and no clear button at all.
 */
export function DevtoolsToolbar({
  paused,
  onTogglePaused,
  onClear,
  clearLabel,
  leading,
  children,
  trailing,
}: {
  paused?: boolean;
  onTogglePaused?: () => void;
  onClear?: () => void;

  clearLabel?: string;

  leading?: ReactNode;

  children?: ReactNode;

  trailing?: ReactNode;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  return (
    <View style={styles.header}>
      <View style={styles.actions}>
        {leading}
        {onTogglePaused && (
          <RecordToggleButton paused={paused ?? false} onToggle={onTogglePaused} />
        )}
        {onClear && (
          <IconButton
            name="block"
            color={COLORS.textSecondary}
            onPress={onClear}
            label={clearLabel ?? 'Clear'}
          />
        )}
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
    flexShrink: 1,
  },

  divider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
}));
