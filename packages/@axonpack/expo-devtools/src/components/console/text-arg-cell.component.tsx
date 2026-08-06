import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { COLORS } from '../../constants/colors.const';
import type { ConsoleArgTone } from '../../utils/console/format-console-args.util';
import { animateNextLayout } from '../../utils/layout-animation.util';

const CLAMP_LINES = 6;
// Clamping is decided from the text itself rather than from `onTextLayout`, which reports only the
// visible lines once `numberOfLines` is set and so can't tell you whether it clipped anything.
const CLAMP_MIN_LENGTH = 300;

const TONE_COLORS: Record<ConsoleArgTone, string> = {
  plain: COLORS.textPrimary,
  number: COLORS.jsonNumber,
  boolean: COLORS.jsonNumber,
  muted: COLORS.textSecondary,
};

export function TextArgCell({
  text,
  tone,
  plainColor,
  selectable = true,
}: {
  text: string;
  tone: ConsoleArgTone;
  /** Overrides the `plain` tone only — an error-level row prints its message in red. */
  plainColor?: string;
  selectable?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = tone === 'plain' ? (plainColor ?? TONE_COLORS.plain) : TONE_COLORS[tone];
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
      {/* Its own tap target — a `selectable` Text above can swallow the press on iOS. */}
      <Text style={styles.toggle}>{expanded ? 'Show less' : 'Show more'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  toggle: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accent,
  },
});
