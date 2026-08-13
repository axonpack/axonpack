import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { TOUCH_TARGET } from '../../constants/metrics.const';
import { animateNextLayout } from '../../utils/layout-animation.util';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';

export function ErrorArgCell({ text, stack }: { text: string; stack?: string }) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const [expanded, setExpanded] = useState(false);

  if (!stack) {
    return (
      <Text style={styles.message} selectable>
        {text}
      </Text>
    );
  }

  return (
    <View>
      <TouchableOpacity
        style={styles.header}
        activeOpacity={0.7}
        onPress={() => {
          animateNextLayout();
          setExpanded((current) => !current);
        }}>
        <MaterialIcons
          name="arrow-drop-down"
          size={18}
          color={COLORS.error}
          style={!expanded && styles.iconCollapsed}
        />
        <Text style={styles.message}>{text}</Text>
      </TouchableOpacity>
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
  message: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 12,
    color: COLORS.error,
  },
  iconCollapsed: {
    transform: [{ rotate: '-90deg' }],
  },
  stack: {
    marginTop: 4,
    marginLeft: 18,
    fontFamily: 'monospace',
    fontSize: 10,
    color: COLORS.textSecondary,
  },
}));
