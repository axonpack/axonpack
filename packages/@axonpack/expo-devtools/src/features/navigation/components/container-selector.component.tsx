import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ContextMenu, type ContextMenuItem } from '../../../core/components/ui/context-menu.ui';
import { HIT_SLOP, TOUCH_TARGET } from '../../../core/constants/metrics.const';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import type { NavigationContainerInfo } from '../stores/navigation.store';

/** Breathing room between the button and the menu it drops. */
const DROPDOWN_GAP = 4;

/**
 * Which container the navigator card is looking at. A dropdown, the way the Storage tab picks a
 * store, with a tick on the active row. With one container there is nothing to choose, so the
 * name is drawn plain.
 */
export function ContainerSelector({
  containers,
  active,
  onChange,
}: {
  containers: NavigationContainerInfo[];
  active: NavigationContainerInfo;
  onChange: (name: string) => void;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const buttonRef = useRef<View>(null);

  if (containers.length < 2) {
    return (
      <View style={styles.plain}>
        <MaterialIcons name="account-tree" size={14} color={COLORS.textSecondary} />
        <Text style={styles.label} numberOfLines={1}>
          {active.name}
        </Text>
      </View>
    );
  }

  const items: ContextMenuItem[] = containers.map((container) => ({
    label: container.name === active.name ? `✓ ${container.name}` : container.name,
    onPress: () => onChange(container.name),
  }));

  // Anchored to the button's own frame, so the menu drops under the control that opened it.
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
        accessibilityLabel="Choose a container"
        style={styles.button}>
        <MaterialIcons name="account-tree" size={14} color={COLORS.textSecondary} />
        <Text style={styles.label} numberOfLines={1}>
          {active.name}
        </Text>
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
    flexShrink: 1,
    maxWidth: 170,
    minHeight: TOUCH_TARGET.dense,
    paddingHorizontal: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 6,
  },
  plain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    minHeight: TOUCH_TARGET.dense,
  },
  label: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
}));
