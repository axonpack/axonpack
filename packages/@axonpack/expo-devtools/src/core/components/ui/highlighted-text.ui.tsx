import { Text, type StyleProp, type TextStyle } from 'react-native';

import { splitByMatches, type MatchRange } from '../../utils/text-search.util';
import { makeThemedStyles } from '../../utils/themed-styles.util';

/**
 * A nested `Text` is the only way React Native paints a background behind part of a string, so
 * matched runs are wrapped rather than styled by range.
 */
export function HighlightedText({
  text,
  ranges,
  style,
  numberOfLines,
  selectable = true,
}: {
  text: string;
  ranges: MatchRange[];
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  selectable?: boolean;
}) {
  const styles = useStyles();

  if (ranges.length === 0) {
    return (
      <Text style={style} numberOfLines={numberOfLines} selectable={selectable}>
        {text}
      </Text>
    );
  }

  return (
    <Text style={style} numberOfLines={numberOfLines} selectable={selectable}>
      {splitByMatches(text, ranges).map((segment, index) =>
        segment.matched ? (
          <Text key={index} style={styles.match}>
            {segment.text}
          </Text>
        ) : (
          segment.text
        )
      )}
    </Text>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  // Background only — the token is translucent so syntax colours still read through it.
  match: {
    backgroundColor: COLORS.matchHighlight,
  },
}));
