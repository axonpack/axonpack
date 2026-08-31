import type { PrettyPrintTheme } from '../../themes';

/** One entry per `TokenType`, so the renderer indexes this by the token it was handed. */
export function buildCodeStyles(theme: PrettyPrintTheme) {
  return {
    block: {
      fontFamily: theme.fontFamily,
      fontSize: theme.fontSize,
      color: theme.text,
      /**
       * The one deliberately web-only key here. `formatCode` emits `\n` and leading indent, which
       * a React Native `Text` honours and HTML collapses — so on the DOM the whole listing renders
       * as a single line without this. `pre` rather than `pre-wrap` so a long line scrolls inside
       * its container, matching the horizontal scroller a native caller mounts. React Native has
       * no `whiteSpace` style prop and no longer validates inline styles, so it drops the key.
       */
      whiteSpace: 'pre',
    },
    keyword: { color: theme.keyword },
    string: { color: theme.string },
    comment: { color: theme.comment, fontStyle: 'italic' as const },
    number: { color: theme.number },
    function: { color: theme.accent },
    tag: { color: theme.tag },
    'attr-name': { color: theme.accent },
    'attr-value': { color: theme.string },
    property: { color: theme.accent },
    selector: { color: theme.tag },
    punctuation: { color: theme.punctuation },
    plain: { color: theme.text },
  };
}

export type CodeStyles = ReturnType<typeof buildCodeStyles>;
