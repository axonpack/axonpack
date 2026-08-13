import { Text } from 'react-native';

import { useCodeStyles } from './shared.styles';
import {
  formatCode,
  MAX_HIGHLIGHT_LENGTH,
  tokenize,
  type Language,
} from '../../../../utils/network/code-highlight.util';

export function CodeHighlight({ code, language }: { code: string; language: Language }) {
  const codeStyles = useCodeStyles();

  if (language === 'plain' || code.length > MAX_HIGHLIGHT_LENGTH) {
    return (
      <Text style={codeStyles.text} selectable>
        {code}
      </Text>
    );
  }

  const formatted = formatCode(code, language);

  return (
    <Text style={codeStyles.text} selectable>
      {tokenize(formatted, language).map((token, index) => (
        <Text key={index} style={codeStyles[token.type]}>
          {token.text}
        </Text>
      ))}
    </Text>
  );
}
