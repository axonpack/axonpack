import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRef, useState } from 'react';
import { TouchableOpacity, View, type GestureResponderEvent } from 'react-native';

import { Tooltip } from './tooltip.ui';
import { HIT_SLOP, TOUCH_TARGET } from '../../constants/metrics.const';
import { makeThemedStyles } from '../../utils/themed-styles.util';

export type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

export function IconButton({
  name,
  color,
  onPress,
  hitSlop = HIT_SLOP.default,
  active = false,
  label,
  dense = false,
}: {
  name: MaterialIconName;
  color: string;
  onPress: (event: GestureResponderEvent) => void;
  hitSlop?: number;
  active?: boolean;

  label?: string;
  /**
   * The dense target, for a trailing control inside a row that is itself tall enough to tap. The
   * 44pt floor on a control of its own would set the height of the line it sits on.
   */
  dense?: boolean;
}) {
  const styles = useStyles();
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
        style={[styles.touchTarget, dense && styles.touchTargetDense]}>
        {}
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

const useStyles = makeThemedStyles((COLORS) => ({
  touchTarget: {
    minWidth: TOUCH_TARGET.compact,
    minHeight: TOUCH_TARGET.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchTargetDense: {
    minWidth: TOUCH_TARGET.dense,
    minHeight: TOUCH_TARGET.dense,
  },
  glyph: {
    padding: 4,
    borderRadius: 8,
  },
  glyphActive: {
    backgroundColor: COLORS.sectionTint,
  },
}));
