import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import { HIT_SLOP, TOUCH_TARGET } from '../../constants/metrics.const';

export function CopyIconButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  async function handlePress() {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1200);
  }

  return (
    <TouchableOpacity onPress={handlePress} hitSlop={HIT_SLOP.dense} style={styles.button}>
      <MaterialIcons
        name={copied ? 'check' : 'content-copy'}
        size={16}
        color={copied ? COLORS.success : COLORS.textSecondary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Dense rather than full-size: this sits in a console row's meta strip and in header tables, where
  // 44dp would be added to the height of every row in the list.
  button: {
    marginLeft: 6,
    width: TOUCH_TARGET.dense,
    height: TOUCH_TARGET.dense,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
