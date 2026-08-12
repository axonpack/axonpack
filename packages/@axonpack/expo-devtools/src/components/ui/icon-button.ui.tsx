import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, type GestureResponderEvent } from 'react-native';

import { Tooltip } from './tooltip.ui';
import { COLORS } from '../../constants/colors.const';
import { HIT_SLOP, TOUCH_TARGET } from '../../constants/metrics.const';

export type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

export function IconButton({
  name,
  color,
  onPress,
  hitSlop = HIT_SLOP.default,
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
        style={styles.touchTarget}>
        {/* The tint stays on this inner pill rather than the touch box, so growing the target to a
            thumb's size didn't turn the active state into a 36×44 slab. */}
        <View style={[styles.glyph, active && styles.glyphActive]}>
          <MaterialIcons name={name} size={19} color={color} />
        </View>
      </TouchableOpacity>
      {label && (
        <Tooltip anchor={tooltipAnchor} label={label} onClose={() => setTooltipAnchor(null)} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    minWidth: TOUCH_TARGET.compact,
    minHeight: TOUCH_TARGET.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    padding: 4,
    borderRadius: 8,
  },
  glyphActive: {
    backgroundColor: COLORS.sectionTint,
  },
});
