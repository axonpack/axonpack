import { useState, useSyncExternalStore } from 'react';
import { type GestureResponderEvent } from 'react-native';

import { themeStore } from '../../stores/theme.store';
import { ContextMenu, type ContextMenuItem } from '../ui/context-menu.ui';
import { IconButton } from '../ui/icon-button.ui';
import { useThemeColors } from '../../utils/themed-styles.util';

function themeLabel(id: string): string {
  return id
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function ThemePicker() {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const activeId = useSyncExternalStore(themeStore.subscribe, themeStore.getActiveId);
  const COLORS = useThemeColors();

  const items: ContextMenuItem[] = themeStore.getIds().map((id) => ({
    label: id === activeId ? `✓ ${themeLabel(id)}` : themeLabel(id),
    onPress: () => themeStore.setActiveId(id),
  }));

  return (
    <>
      <IconButton
        name="palette"
        color={COLORS.textSecondary}
        label="Theme"
        onPress={(event: GestureResponderEvent) =>
          setAnchor({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY })
        }
      />
      <ContextMenu anchor={anchor} items={items} onClose={() => setAnchor(null)} />
    </>
  );
}
