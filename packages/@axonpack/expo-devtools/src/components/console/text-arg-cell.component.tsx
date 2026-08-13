import { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';

import type { Palette } from '../../constants/theme.const';
import type { ConsoleArgTone } from '../../utils/console/format-console-args.util';
import { animateNextLayout } from '../../utils/layout-animation.util';
import { makeThemedStyles, useThemeColors } from '../../utils/themed-styles.util';

const CLAMP_LINES = 6;

const CLAMP_MIN_LENGTH = 300;

function toneColor(tone: ConsoleArgTone, COLORS: Palette): string {
  if (tone === 'number' || tone === 'boolean') return COLORS.jsonNumber;
  if (tone === 'muted') return COLORS.textSecondary;
  return COLORS.textPrimary;
}

export function TextArgCell({
  text,
  tone,
  plainColor,
  selectable = true,
}: {
  text: string;
  tone: ConsoleArgTone;

  plainColor?: string;
  selectable?: boolean;
}) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const color = tone === 'plain' ? (plainColor ?? COLORS.textPrimary) : toneColor(tone, COLORS);
  const clampable = text.length > CLAMP_MIN_LENGTH || text.split('\n').length > CLAMP_LINES;

  if (!clampable) {
    return (
      <Text style={[styles.text, { color }]} selectable={selectable}>
        {text}
      </Text>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => {
        animateNextLayout();
        setExpanded((current) => !current);
      }}>
      <Text
        style={[styles.text, { color }]}
        numberOfLines={expanded ? undefined : CLAMP_LINES}
        selectable={selectable}>
        {text}
      </Text>
      {}
      <Text style={styles.toggle}>{expanded ? 'Show less' : 'Show more'}</Text>
    </TouchableOpacity>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  text: {
    fontFamily: 'monospace',
    fontSize: 12,
  },

  toggle: {
    marginTop: 2,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
}));
