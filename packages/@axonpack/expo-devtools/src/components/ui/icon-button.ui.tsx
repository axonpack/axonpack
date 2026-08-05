import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, type GestureResponderEvent } from 'react-native';

import { Tooltip } from './tooltip.ui';
import { COLORS } from '../../constants/colors.const';

export type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

export function IconButton({
  name,
  color,
  onPress,
  hitSlop = 8,
  active = false,
  label,
}: {
  name: MaterialIconName;
  color: string;
  onPress: (event: GestureResponderEvent) => void;
  hitSlop?: number;
  active?: boolean;
  /** Shown as a long-press tooltip — the icon alone carries no visible text. */
  label?: string;
}) {
  const [tooltipAnchor, setTooltipAnchor] = useState<{ x: number; y: number } | null>(null);
  const suppressNextPress = useRef(false);

  function handleLongPress(event: GestureResponderEvent) {
    suppressNextPress.current = true;
    setTooltipAnchor({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
  }

  function handlePress(event: GestureResponderEvent) {
    if (suppressNextPress.current) {
      suppressNextPress.current = false;
      return;
    }
    onPress(event);
  }

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={label ? handleLongPress : undefined}
        onPressOut={label ? () => setTooltipAnchor(null) : undefined}
        hitSlop={hitSlop}
        style={[styles.iconButton, active && styles.iconButtonActive]}>
        <MaterialIcons name={name} size={19} color={color} />
      </TouchableOpacity>
      {label && (
        <Tooltip anchor={tooltipAnchor} label={label} onClose={() => setTooltipAnchor(null)} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    padding: 4,
    borderRadius: 8,
  },
  iconButtonActive: {
    backgroundColor: COLORS.sectionTint,
  },
});
