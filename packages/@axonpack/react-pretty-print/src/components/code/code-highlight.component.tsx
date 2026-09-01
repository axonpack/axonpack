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
};

export function CodeHighlight({
  primitives,
  code,
  language,
  theme = DARK_THEME,
  format = true,
}: CodeHighlightProps) {
  const { Text } = primitives;
  const styles = useMemo(() => buildCodeStyles(theme), [theme]);

  // Above the cap the tokenizer walks the whole string per rule per character; a body that big
  // renders unhighlighted rather than freezing the thread.
  if (language === 'plain' || code.length > MAX_HIGHLIGHT_LENGTH) {
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
