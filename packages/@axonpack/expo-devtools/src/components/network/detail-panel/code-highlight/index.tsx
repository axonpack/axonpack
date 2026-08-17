import { Text } from 'react-native';

import { useCodeStyles } from './shared.styles';
import {
  formatCode,
  MAX_HIGHLIGHT_LENGTH,
  tokenize,
  type Language,
} from '../../../../utils/network/code-highlight.util';
import { clipMatches, findMatches, type Matcher } from '../../../../utils/text-search.util';
import { HighlightedText } from '../../../ui/highlighted-text.ui';

export function CodeHighlight({
  code,
  language,
  matcher = null,
}: {
  code: string;
  language: Language;
  matcher?: Matcher | null;
}) {
  const codeStyles = useCodeStyles();

  if (language === 'plain' || code.length > MAX_HIGHLIGHT_LENGTH) {
    return (
      <HighlightedText text={code} ranges={findMatches(code, matcher)} style={codeStyles.text} />
    );
  }

  const formatted = formatCode(code, language);
  // Matched once against the whole string, then clipped per token, so a match spanning a token
  // boundary still paints across both halves.
  const matches = findMatches(formatted, matcher);
  let offset = 0;

  return (
    <Text style={codeStyles.text} selectable>
      {tokenize(formatted, language).map((token, index) => {
        const start = offset;
        offset += token.text.length;
        return (
          <HighlightedText
            key={index}
            text={token.text}
            ranges={clipMatches(matches, start, offset)}
            style={codeStyles[token.type]}
          />
        );
      })}
    </Text>
  );
}
