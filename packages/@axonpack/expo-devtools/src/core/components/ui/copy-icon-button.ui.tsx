import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import { TouchableOpacity } from 'react-native';

import { HIT_SLOP, TOUCH_TARGET } from '../../constants/metrics.const';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';

export function CopyIconButton({ value }: { value: string }) {
  const styles = useStyles();
  const COLORS = useThemeColors();
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

const useStyles = makeThemedStyles(() => ({
  button: {
    marginLeft: 6,
    width: TOUCH_TARGET.dense,
    height: TOUCH_TARGET.dense,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
