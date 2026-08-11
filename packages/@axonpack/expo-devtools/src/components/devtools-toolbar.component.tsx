import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { COLORS } from '../constants/colors.const';
import { IconButton } from './ui/icon-button.ui';
import { RecordToggleButton } from './ui/record-toggle-button.ui';

/**
 * The toolbar every tab starts with: record, then clear, then whatever that tab adds.
 *
 * Core rather than feature-scoped because all three views need the same one, and they had drifted —
 * the performance tab put clear on the far right with a different glyph, and only two of the three
 * spaced their buttons. Owning it here means a tab can only differ where it passes something in.
 */
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
  /** Named per tab — "Clear log" reads better than "Clear" on a long-press tooltip. */
  clearLabel: string;
  /** This tab's own actions, appended to the same left-hand group. */
  children?: ReactNode;
  /** A second group pinned to the right, e.g. the console's level counts. */
  trailing?: ReactNode;
}) {
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
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
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
    marginHorizontal: 6,
  },
});
