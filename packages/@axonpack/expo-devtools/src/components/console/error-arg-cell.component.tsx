import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import { animateNextLayout } from '../../utils/layout-animation.util';

export function ErrorArgCell({ text, stack }: { text: string; stack?: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!stack) {
    return (
      <Text style={styles.message} selectable>
        {text}
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        activeOpacity={0.7}
        onPress={() => {
          animateNextLayout();
          setExpanded((current) => !current);
        }}>
        <MaterialIcons
          name="arrow-drop-down"
          size={16}
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

const styles = StyleSheet.create({
  // An error message plus its stack owns the full row width rather than flowing beside other args.
  container: {
    flexBasis: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 2,
  },
  message: {
    flexShrink: 1,
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
});
