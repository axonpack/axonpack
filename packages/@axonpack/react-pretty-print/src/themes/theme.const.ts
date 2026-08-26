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
  fontFamily: string;
  fontSize: number;
};
