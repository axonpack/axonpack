import { useMemo } from 'react';

import {
  formatCode,
  MAX_HIGHLIGHT_LENGTH,
  tokenize,
  type Language,
} from '../../utils/code/code-highlight.util';
import type { Primitives } from '../shared/primitives.ui';
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
};

export function CodeHighlight({
  primitives,
  code,
  language,
  theme = DARK_THEME,
  format = true,
  maxHighlightLength = MAX_HIGHLIGHT_LENGTH,
}: CodeHighlightProps) {
  const { Text } = primitives;
  const styles = useMemo(() => buildCodeStyles(theme), [theme]);

  if (language === 'plain' || code.length > maxHighlightLength) {
    return (
      <Text style={styles.block} selectable>
        {code}
      </Text>
    );
  }

  const source = format ? formatCode(code, language) : code;

  return (
    <Text style={styles.block} selectable>
      {tokenize(source, language).map((token, index) => (
        <Text key={index} style={styles[token.type]}>
          {token.text}
        </Text>
      ))}
    </Text>
  );
}
