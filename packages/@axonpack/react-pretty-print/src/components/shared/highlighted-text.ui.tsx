import { splitByMatches, type MatchRange } from '../../utils/shared/text-search.util';
import type { Primitives } from './primitives.ui';

/**
 * A nested text node is the only way React Native paints a background behind part of a string, so
 * matched runs are wrapped rather than styled by range. The DOM would allow either; wrapping is what
 * works on both.
 */
export function HighlightedText({
  primitives,
  text,
  ranges,
  style,
  highlight,
  selectable,
}: {
  primitives: Primitives;
  text: string;
  ranges: MatchRange[];
  style?: unknown;
  /** Background only — the token is translucent so syntax colours still read through it. */
  highlight: string;
  selectable?: boolean;
}) {
  const { Text } = primitives;

  // The common case by far: one node, so a body with no matches costs nothing extra.
  if (ranges.length === 0) {
    return (
      <Text style={style} selectable={selectable}>
        {text}
      </Text>
    );
  }

  return (
    <Text style={style} selectable={selectable}>
      {splitByMatches(text, ranges).map((segment, index) =>
        segment.matched ? (
          <Text key={index} style={{ backgroundColor: highlight }}>
            {segment.text}
          </Text>
        ) : (
          segment.text
        )
      )}
    </Text>
  );
}
