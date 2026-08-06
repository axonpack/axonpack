// Chrome DevTools' light-mode Network tab palette.
export const COLORS = {
  background: '#ffffff',
  toolbarBackground: '#f3f3f3',
  border: '#d0d0d0',
  sectionTint: '#eaf1fc',
  textPrimary: '#202124',
  textSecondary: '#5f6368',
  accent: '#1a73e8',
  // Amber rather than grey — grey matched textSecondary exactly, so an in-flight request read as
  // muted body text instead of a distinct state.
  pending: '#f9ab00',
  success: '#188038',
  error: '#d93025',
  warning: '#f9ab00',
  keyAccent: '#d97706',
  // Matches Chrome DevTools' JS/JSON syntax highlighting (object key, string, number/boolean).
  jsonKey: '#881391',
  jsonString: '#c41a16',
  jsonNumber: '#1c00cf',
  // Extra tokens for the Preview tab's plain-text code highlighter (JS/CSS/HTML) — string,
  // number, and key/name-ish tokens reuse the JSON colors above rather than adding more hues.
  codeKeyword: '#0000ff',
  codeComment: '#008000',
  codeTag: '#800000',
};
