import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { HIT_SLOP, TOUCH_TARGET } from '../../constants/metrics.const';
import type { StorageAdapterState } from '../../stores/storage/storage.store';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';
import { ContextMenu, type ContextMenuItem } from '../ui/context-menu.ui';

/** Breathing room between the button and the menu it drops. */
const DROPDOWN_GAP = 4;

/**
 * Which store the tab is looking at. A dropdown rather than a chip per store: the chips took a whole
 * row of their own and wrapped to two once an app registered four, while the toolbar already had the
 * width for one control. Built on `ContextMenu` with a `✓` on the active row, the same way the header's
 * theme picker does it.
 */
export function AdapterSelector({
  adapters,
  activeId,
  onChange,
}: {
  adapters: StorageAdapterState[];
  activeId: string | null;
  onChange: (adapterId: string) => void;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const buttonRef = useRef<View>(null);

  const active = adapters.find((state) => state.adapter.id === activeId) ?? adapters[0];

  // One registered store is not a choice, and the summary below already names it.
  if (adapters.length < 2 || active === undefined) return null;

  const items: ContextMenuItem[] = adapters.map((state) => {
    const label = `${state.adapter.name} (${state.entries.length})`;
    return {
      label: state.adapter.id === active.adapter.id ? `✓ ${label}` : label,
      onPress: () => onChange(state.adapter.id),
    };
  });

  /**
   * Anchored to the button's own frame, not to `pageX`/`pageY`. A dropdown belongs under the control
   * that opened it; measuring from the touch point is right for a 24dp kebab, but this button is wide
   * enough that tapping near its trailing edge would drop the menu well away from it.
   */
  function openMenu() {
    buttonRef.current?.measureInWindow((x, y, _width, buttonHeight) => {
      setAnchor({ x, y: y + buttonHeight + DROPDOWN_GAP });
    });
  }

  return (
    <>
      <TouchableOpacity
        ref={buttonRef}
        onPress={openMenu}
        hitSlop={HIT_SLOP.default}
        accessibilityLabel="Choose a store"
        style={styles.button}>
        <MaterialIcons name="storage" size={14} color={COLORS.textSecondary} />
        <Text style={styles.label} numberOfLines={1}>
          {active.adapter.name}
        </Text>
        <Text style={styles.count}>{active.entries.length}</Text>
        <MaterialIcons name="arrow-drop-down" size={18} color={COLORS.textSecondary} />
      </TouchableOpacity>
      <ContextMenu anchor={anchor} items={items} onClose={() => setAnchor(null)} />
    </>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    // Shrinks rather than pushing the toolbar's buttons off the row; a long store name truncates.
    flexShrink: 1,
    maxWidth: 170,
    minHeight: TOUCH_TARGET.dense,
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 6,
  },
  label: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  count: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontVariant: ['tabular-nums'],
  },
}));
