import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useCrashDetailStyles } from './shared.styles';
import { CollapsibleSection } from '../../../../core/components/ui/collapsible-section.ui';
import { MONOSPACE } from '../../../../core/constants/typography.const';
import type { CodeFrame } from '../../../../core/services/symbolicate-stack.service';
import { isMarkedCodeFrameLine } from '../../../../core/utils/code-frame.util';
import { formatFrameLocation } from '../../../../core/utils/frame-location.util';
import { makeThemedStyles } from '../../../../core/utils/themed-styles.util';

function SourceCard({ codeFrame }: { codeFrame: CodeFrame }) {
  const styles = useStyles();
  const detailStyles = useCrashDetailStyles();

  const position = codeFrame.location;

  return (
    <View style={styles.card}>
      <ScrollView horizontal contentContainerStyle={detailStyles.frameScrollContent}>
        <View style={styles.code}>
          {codeFrame.content.split('\n').map((line, index) => (
            // Source lines are positional and a blank one can repeat, so the index is the identity.
            <Text
              key={`${index}-${line}`}
              style={[styles.codeLine, isMarkedCodeFrameLine(line) && styles.codeLineMarked]}
              selectable>
              {line}
            </Text>
          ))}
        </View>
      </ScrollView>

      {codeFrame.fileName.length > 0 && (
        <Text style={styles.fileName} selectable>
          {formatFrameLocation(codeFrame.fileName)}
          {position ? ` (${position.row}:${position.column})` : ''}
        </Text>
      )}
    </View>
  );
}

/**
 * One card per stack that had a source to show: where it threw, and — for a render error — which
 * element rendered it. Plural heading only when there is more than one, as in React Native's own.
 */
export function SourceFrames({ codeFrames }: { codeFrames: CodeFrame[] }) {
  const styles = useStyles();

  if (codeFrames.length === 0) return null;

  return (
    <CollapsibleSection title={codeFrames.length > 1 ? 'Sources' : 'Source'}>
      <View style={styles.cards}>
        {codeFrames.map((codeFrame, index) => (
          <SourceCard key={`${index}-${codeFrame.fileName}`} codeFrame={codeFrame} />
        ))}
      </View>
    </CollapsibleSection>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  cards: {
    gap: 8,
    paddingVertical: 4,
  },
  /** Bordered, because two snippets in a row otherwise read as one file with a gap in it. */
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  code: {
    paddingVertical: 6,
  },
  codeLine: {
    fontFamily: MONOSPACE,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
  /** The failing line and its caret are the reason the block is here. */
  codeLineMarked: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  fileName: {
    fontFamily: MONOSPACE,
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.sectionTint,
  },
}));
