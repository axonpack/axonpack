/**
 * The token contract every palette fills. One flat object rather than a stylesheet, so each
 * renderer turns roles into its own styles and nothing has to be translated between platforms.
 */
export type PrettyPrintTheme = {
  /**
   * The surface a palette was designed against. No renderer paints it — the caller owns its own
   * container — but a dark palette on a light page is unreadable, so every palette states it.
   */
  background: string;
  /** JSON keys, XML element names. */
  key: string;
  string: string;
  number: string;
  boolean: string;
  null: string;
  punctuation: string;
  toggle: string;
  /** Unclassified code text, and the `plain` token type. */
  text: string;
  keyword: string;
  comment: string;
  /** Function names, CSS properties, XML/HTML attribute names. */
  accent: string;
  /** Markup tags and CSS selectors. */
  tag: string;
  /**
   * The band behind a search match. Must be translucent — an 8-digit hex or an `rgba()` — because
   * the matched text keeps its own syntax colour and reads through it. React Native and CSS both
   * accept `#rrggbbaa`.
   */
  matchHighlight: string;
  /**
   * A single family name, not a CSS stack — React Native looks the string up verbatim, so a
   * comma-separated list matches nothing. Every shipped palette says `monospace`, which is right on
   * the web and on Android and **silently proportional on iOS**, where the family is called `Menlo`.
   * React Native callers should override it per platform; see the note in `palettes.const.ts`.
   */
  fontFamily: string;
  fontSize: number;
};
