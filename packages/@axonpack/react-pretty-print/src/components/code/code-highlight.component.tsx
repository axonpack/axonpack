import { useMemo } from 'react';

import {
  formatCode,
  MAX_HIGHLIGHT_LENGTH,
  tokenize,
  type Language,
  type TokenType,
} from '../../utils/code/code-highlight.util';
import { HighlightedText } from '../shared/highlighted-text.ui';
import type { Primitives } from '../shared/primitives.ui';
import {
  clipMatches,
  findMatches,
  type Matcher,
  type MatchRange,
} from '../../utils/shared/text-search.util';
import { buildCodeStyles } from '../../utils/code/code-styles.util';
import { DARK_THEME, type PrettyPrintTheme } from '../../themes';

export type CodeHighlightProps = {
  primitives: Primitives;
  code: string;
  language: Language;
  theme?: PrettyPrintTheme;
  /**
   * Re-indents minified javascript/css before highlighting. On by default, since minified input is
   * unreadable without it; turn it off for source you already formatted yourself.
   */
  format?: boolean;
  /**
   * Above this many characters the source renders unhighlighted. Defaults to
   * `MAX_HIGHLIGHT_LENGTH`; raise it if you would rather wait, or pass `Infinity` to remove the cap.
   *
   * The cap exists because tokenizing walks the string once per rule per position, so cost grows
   * with length times the size of the language's rule table — a megabyte of minified source is
   * enough to block the thread. That is the trade being made when this is raised.
   */
  maxHighlightLength?: number;
  /**
   * Paints a background behind every run matching this. Pass the matcher your search UI already
   * compiled; the shape is plain data, so nothing needs converting.
   */
  matcher?: Matcher | null;
};

export function CodeHighlight({
  primitives,
  code,
  language,
  theme = DARK_THEME,
  format = true,
  maxHighlightLength = MAX_HIGHLIGHT_LENGTH,
  matcher = null,
}: CodeHighlightProps) {
  const { Text } = primitives;
  const styles = useMemo(() => buildCodeStyles(theme), [theme]);

  if (language === 'plain' || code.length > maxHighlightLength) {
    return (
      <HighlightedText
        primitives={primitives}
        text={code}
        ranges={findMatches(code, matcher)}
        style={styles.block}
        highlight={theme.matchHighlight}
        selectable
      />
    );
  }

  const source = format ? formatCode(code, language) : code;
  // Matched once against the whole string, then clipped per token, so a match spanning a token
  // boundary still paints across both halves.
  const matches = findMatches(source, matcher);

  // A plain loop rather than an offset accumulated inside a `map` callback: the running cursor is
  // only correct while the callback runs exactly once, in order, which is not a promise React makes.
  const spans: { text: string; type: TokenType; ranges: MatchRange[] }[] = [];
  let cursor = 0;
  for (const token of tokenize(source, language)) {
    const start = cursor;
    cursor += token.text.length;
    spans.push({ ...token, ranges: clipMatches(matches, start, cursor) });
  }

  return (
    <Text style={styles.block} selectable>
      {spans.map((span, index) => (
        <HighlightedText
          key={index}
          primitives={primitives}
          text={span.text}
          ranges={span.ranges}
          style={styles[span.type]}
          highlight={theme.matchHighlight}
        />
      ))}
    </Text>
  );
}
