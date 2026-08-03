import { Text } from 'react-native';

import { formatCode, MAX_HIGHLIGHT_LENGTH, tokenize, type Language } from './code-highlight.util';
import { codeStyles } from './shared.styles';

export function CodeHighlight({ code, language }: { code: string; language: Language }) {
  // A TextInput can't render multi-colored inline runs, so unlike the read-only response/payload
  // views this stays a plain selectable Text tree — native selection is the only copy affordance.
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
