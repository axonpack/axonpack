import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MONOSPACE } from '../../../../core/constants/typography.const';
import {
  symbolicateStack,
  type SymbolicatedStack,
} from '../../../../core/services/symbolicate-stack.service';
import { isMarkedCodeFrameLine } from '../../../../core/utils/code-frame.util';
import { formatFrameLocation } from '../../../../core/utils/frame-location.util';
import type { StackFrame } from '../../../../core/utils/parse-stack.util';
import { makeThemedStyles } from '../../../../core/utils/themed-styles.util';
import type { NetworkLogEntry } from '../../stores/network-log.store';

type State =
  | { phase: 'loading' }
  /** No dev server answered, so the frames stay as the bundle wrote them. */
  | { phase: 'raw' }
  | { phase: 'symbolicated'; result: SymbolicatedStack };

export function InitiatorTab({ entry }: { entry: NetworkLogEntry }) {
  const styles = useStyles();
  const captured = entry.initiator ?? [];
  const [state, setState] = useState<State>({ phase: 'loading' });

  // Symbolicated here rather than at capture time: this is a round trip to the dev server, and only
  // the one request somebody opens is worth spending it on. The service caches per entry id.
  useEffect(() => {
    let active = true;
    setState({ phase: 'loading' });
    symbolicateStack(entry.id, captured).then((result) => {
      if (!active) return;
      setState(result ? { phase: 'symbolicated', result } : { phase: 'raw' });
    });
    return () => {
      active = false;
    };
  }, [entry.id, captured]);

  if (captured.length === 0) {
    return <Text style={styles.note}>No call stack was captured for this request.</Text>;
  }

  const frames = state.phase === 'symbolicated' ? state.result.frames : captured;
  const codeFrame = state.phase === 'symbolicated' ? state.result.codeFrames[0] : undefined;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {state.phase === 'loading' && <Text style={styles.note}>Symbolicating…</Text>}
      {state.phase === 'raw' && (
        <Text style={styles.note}>
          Not symbolicated — no development server answered, so these are bundle positions.
        </Text>
      )}

      {codeFrame && (
        <View style={styles.card}>
          <Text style={styles.fileName} numberOfLines={1} selectable>
            {codeFrame.fileName}
          </Text>
          {codeFrame.content.split('\n').map((line, index) => (
            // Source lines are positional and a blank one can repeat, so the index is the identity.
            <Text
              key={`${index}-${line}`}
              style={[styles.code, isMarkedCodeFrameLine(line) && styles.codeMarked]}
              selectable>
              {line}
            </Text>
          ))}
        </View>
      )}

      {frames.map((frame: StackFrame, index) => (
        <View key={`${index}-${frame.location}`} style={styles.frame}>
          <Text style={[styles.fn, frame.vendor && styles.vendor]} numberOfLines={1}>
            {frame.fn}
          </Text>
          <Text
            style={[styles.location, frame.vendor && styles.vendor]}
            numberOfLines={1}
            selectable>
            {formatFrameLocation(frame.location)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  content: {
    padding: 10,
    gap: 8,
  },
  note: {
    padding: 10,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  card: {
    padding: 8,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 2,
  },
  fileName: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  code: {
    fontFamily: MONOSPACE,
    fontSize: 11,
    lineHeight: 15,
    color: COLORS.textSecondary,
  },
  codeMarked: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  frame: {
    gap: 1,
  },
  fn: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  location: {
    fontFamily: MONOSPACE,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  vendor: {
    opacity: 0.55,
  },
}));
