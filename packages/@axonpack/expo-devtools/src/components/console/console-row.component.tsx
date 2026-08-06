import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import { CONSOLE_LEVEL_VISUALS } from '../../constants/console/console-levels.const';
import type { ConsoleLogEntry } from '../../stores/console/console-log.store';

const COLLAPSED_LINES = 4;

export function ConsoleRow({ entry }: { entry: ConsoleLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const visual = CONSOLE_LEVEL_VISUALS[entry.level];

  return (
    <TouchableOpacity
      onPress={() => setExpanded((current) => !current)}
      activeOpacity={0.7}
      style={[styles.row, visual.surface ? { backgroundColor: visual.surface } : null]}>
      <MaterialIcons name={visual.icon} size={14} color={visual.color} style={styles.icon} />

      <View style={styles.body}>
        <Text
          style={[styles.text, entry.level === 'error' && { color: COLORS.error }]}
          numberOfLines={expanded ? undefined : COLLAPSED_LINES}
          selectable>
          {entry.text}
        </Text>
        {expanded && entry.stack && (
          <Text style={styles.stack} selectable>
            {entry.stack}
          </Text>
        )}
      </View>

      {entry.count > 1 && <Text style={styles.count}>{entry.count}</Text>}
      <Text style={styles.time}>{new Date(entry.timestamp).toLocaleTimeString()}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  icon: {
    marginTop: 1,
  },
  body: {
    flex: 1,
  },
  text: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  stack: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  count: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    backgroundColor: COLORS.textSecondary,
    borderRadius: 8,
    minWidth: 16,
    textAlign: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  time: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
