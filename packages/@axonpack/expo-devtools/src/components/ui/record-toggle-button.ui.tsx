import { useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, type GestureResponderEvent } from 'react-native';

import { RecordToggleIcon } from './record-toggle-icon.ui';
import { Tooltip } from './tooltip.ui';
import { COLORS } from '../../constants/colors.const';
import { HIT_SLOP, TOUCH_TARGET } from '../../constants/metrics.const';

/**
 * Start/stop capture, shared by the Network and Console tabs. Same long-press tooltip behaviour as
 * `IconButton`, but it can't reuse that component — the glyph is `RecordToggleIcon`, not a
 * MaterialIcon.
 */
export function RecordToggleButton({
  paused,
  onToggle,
}: {
  paused: boolean;
  onToggle: () => void;
}) {
  const [tooltipAnchor, setTooltipAnchor] = useState<{ x: number; y: number } | null>(null);
  const suppressNextPress = useRef(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => {
          if (suppressNextPress.current) {
            suppressNextPress.current = false;
            return;
          }
          onToggle();
        }}
        onLongPress={(event: GestureResponderEvent) => {
          suppressNextPress.current = true;
          setTooltipAnchor({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
        }}
        onPressOut={() => setTooltipAnchor(null)}
        hitSlop={HIT_SLOP.default}
        style={styles.touchTarget}>
        <View style={[styles.glyph, paused && styles.glyphActive]}>
          <RecordToggleIcon
            size={18}
            color={paused ? COLORS.textSecondary : COLORS.error}
            shape={paused ? 'circle' : 'square'}
          />
        </View>
      </TouchableOpacity>
      <Tooltip
        anchor={tooltipAnchor}
        label={paused ? 'Start recording' : 'Stop recording'}
        onClose={() => setTooltipAnchor(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Matches `IconButton` exactly, so the toolbar's first two buttons are the same size as the rest.
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
