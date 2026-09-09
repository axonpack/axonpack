import type { PrettyPrintTheme } from '../../themes';

export const INDENT_PER_DEPTH = 14;

/**
 * The floor for a tree row, which is a tap target: every row toggles, and on a touch screen a row
 * that only fits its 12px text is a row people miss. Named rather than written inline at each use,
 * because a dimension deciding whether something can be *hit* is not a styling detail — picked by
 * eye once, it drifts back under the floor the next time the type size changes.
 */
export const ROW_MIN_HEIGHT = 28;

/**
 * Every style here has to mean the same thing to RN's layout engine and to CSS, and the two
 * disagree on three defaults rather than on property names:
 *
 * - RN gives every `View` `display: flex`; a `<div>` is `display: block`, so `flexDirection` is
 *   inert until `display` is stated. This is what stacked the toggle above each row on web.
 * - RN's default `flexDirection` is `column`, CSS's is `row` — so a flex container that relies on
 *   the default has to say which it wants.
 * - RN's default `flexShrink` is `0`, CSS's is `1`, so a fixed-width child needs it spelled out or
 *   the browser shrinks it away.
 *
 * Longhand only, for the same reason: RN understands `paddingVertical` and CSS doesn't.
 */
export function buildTreeStyles(theme: PrettyPrintTheme) {
  return {
    row: {
      display: 'flex' as const,
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      minHeight: ROW_MIN_HEIGHT,
      paddingTop: 4,
      paddingBottom: 4,
    },
    toggle: {
      display: 'flex' as const,
      flexDirection: 'column' as const,
      alignItems: 'center' as const,
      flexShrink: 0,
      width: 16,
    },
    toggleGlyph: {
      color: theme.toggle,
      fontFamily: theme.fontFamily,
      fontSize: theme.fontSize,
    },
    /** The monospace face on its own, for a row that holds several inline nodes side by side. */
    mono: {
      fontFamily: theme.fontFamily,
      fontSize: theme.fontSize,
    },
    /**
     * For the single node that fills a row. `flex: 1` belongs only there — put it on siblings and
     * they each grow to an equal share, which spreads a tag's attributes across the whole width.
     */
    text: {
      flex: 1,
      fontFamily: theme.fontFamily,
      fontSize: theme.fontSize,
    },
    /**
     * XML rows carry each attribute as its own inline node, so a long tag wraps rather than
     * overflows, and `gap` separates them. A literal leading space would not: a flex item is
     * blockified, and CSS trims whitespace at the edges of one.
     */
    wrapRow: {
      display: 'flex' as const,
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      columnGap: 4,
      alignItems: 'flex-start' as const,
      minHeight: ROW_MIN_HEIGHT,
      paddingTop: 4,
      paddingBottom: 4,
    },
    error: {
      fontFamily: theme.fontFamily,
      fontSize: theme.fontSize,
      fontStyle: 'italic' as const,
      color: theme.punctuation,
    },
    key: { color: theme.key },
    punctuation: { color: theme.punctuation },
    string: { color: theme.string },
    number: { color: theme.number },
    boolean: { color: theme.boolean },
    nullValue: { color: theme.null },
    matchHighlight: { backgroundColor: theme.matchHighlight },
  };
}

export type TreeStyles = ReturnType<typeof buildTreeStyles>;
