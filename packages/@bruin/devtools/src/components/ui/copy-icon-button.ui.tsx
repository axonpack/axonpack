import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { COLORS } from '../../constants/colors.const';

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
    <TouchableOpacity onPress={handlePress} hitSlop={12} style={styles.button}>
      <MaterialIcons
        name={copied ? 'check' : 'content-copy'}
        size={14}
        color={copied ? COLORS.success : COLORS.textSecondary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginLeft: 6,
  },
});
