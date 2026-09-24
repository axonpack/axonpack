import type { PrettyPrintTheme } from '@axonpack/react-pretty-print/themes';

import type { Palette } from '../../core/constants/theme.const';

/** The app's theme in the pretty printer's terms, so a tree in the tab wears the app's colours. */
export function prettyPrintTheme(palette: Palette): PrettyPrintTheme {
  return {
    background: palette.background,
    text: palette.textPrimary,
    key: palette.jsonKey,
    string: palette.jsonString,
    number: palette.jsonNumber,
    boolean: palette.jsonNumber,
    null: palette.textSecondary,
    punctuation: palette.textSecondary,
    toggle: palette.textSecondary,
    keyword: palette.codeKeyword,
    comment: palette.codeComment,
    accent: palette.accent,
    tag: palette.codeTag,
    matchHighlight: palette.matchHighlight,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
  };
}
