import { useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, type GestureResponderEvent } from 'react-native';

import { RecordToggleIcon } from './record-toggle-icon.ui';
import { Tooltip } from './tooltip.ui';
import { COLORS } from '../../constants/colors.const';

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
        hitSlop={8}
        style={[styles.button, paused && styles.buttonActive]}>
        <RecordToggleIcon
          size={18}
          color={paused ? COLORS.textSecondary : COLORS.error}
          shape={paused ? 'circle' : 'square'}
        />
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
  button: {
    padding: 4,
    borderRadius: 8,
  },
  buttonActive: {
    backgroundColor: COLORS.sectionTint,
  },
});
