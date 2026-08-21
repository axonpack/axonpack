import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { HIT_SLOP, TOUCH_TARGET } from '../../../core/constants/metrics.const';
import { MONOSPACE } from '../../../core/constants/typography.const';
import { animateNextLayout } from '../../../core/utils/layout-animation.util';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';

/**
 * `onOpenReport` is the crash report for this very error. When there is one it takes the message
 * press, because the report is a superset of the inline stack — symbolicated, with breadcrumbs and
 * device details — and the disclosure arrow keeps the inline stack for when that is all you want.
 */
export function ErrorArgCell({
  text,
  stack,
  onOpenReport,
}: {
  text: string;
  stack?: string;
  onOpenReport?: () => void;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const [expanded, setExpanded] = useState(false);

  if (!stack) {
    if (!onOpenReport) {
      return (
        <Text style={styles.message} selectable>
          {text}
        </Text>
      );
    }

    return (
      <TouchableOpacity style={styles.header} activeOpacity={0.7} onPress={onOpenReport}>
        <Text style={styles.message}>{text}</Text>
        <MaterialIcons name="chevron-right" size={16} color={COLORS.error} />
      </TouchableOpacity>
    );
  }

  function toggle() {
    animateNextLayout();
    setExpanded((current) => !current);
  }

  return (
    <View>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={toggle}
          hitSlop={HIT_SLOP.dense}
          style={styles.disclosure}
          activeOpacity={0.7}>
          <MaterialIcons
            name="arrow-drop-down"
            size={18}
            color={COLORS.error}
            style={!expanded && styles.iconCollapsed}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.messagePress}
          activeOpacity={0.7}
          onPress={onOpenReport ?? toggle}>
          <Text style={styles.message}>{text}</Text>
          {onOpenReport && <MaterialIcons name="chevron-right" size={16} color={COLORS.error} />}
        </TouchableOpacity>
      </View>
      {expanded && (
        <Text style={styles.stack} selectable>
          {stack}
        </Text>
      )}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 2,
    minHeight: TOUCH_TARGET.dense,
  },
  /** Its own target, so the arrow still only ever expands. */
  disclosure: {
    width: 18,
    minHeight: TOUCH_TARGET.dense,
    justifyContent: 'center',
  },
  messagePress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    minHeight: TOUCH_TARGET.dense,
  },
  message: {
    flex: 1,
    fontFamily: MONOSPACE,
    fontSize: 12,
    color: COLORS.error,
  },
  iconCollapsed: {
    transform: [{ rotate: '-90deg' }],
  },
  stack: {
    marginTop: 4,
    marginLeft: 18,
    fontFamily: MONOSPACE,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
}));
