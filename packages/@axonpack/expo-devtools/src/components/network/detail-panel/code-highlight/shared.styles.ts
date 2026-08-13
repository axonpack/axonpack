import { makeThemedStyles } from '../../../../utils/themed-styles.util';

export const useCodeStyles = makeThemedStyles((COLORS) => ({
  text: {
    fontFamily: 'monospace',
    fontSize: 12,
    flexWrap: 'wrap',
  },
  keyword: { color: COLORS.codeKeyword },
  string: { color: COLORS.jsonString },
  comment: { color: COLORS.codeComment, fontStyle: 'italic' },
  number: { color: COLORS.jsonNumber },
  function: { color: COLORS.keyAccent },
  tag: { color: COLORS.codeTag },
  'attr-name': { color: COLORS.keyAccent },
  'attr-value': { color: COLORS.jsonString },
  property: { color: COLORS.keyAccent },
  selector: { color: COLORS.codeTag },
  punctuation: { color: COLORS.textSecondary },
  plain: { color: COLORS.textPrimary },
}));
