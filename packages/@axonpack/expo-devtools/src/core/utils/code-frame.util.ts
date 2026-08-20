/**
 * `@babel/code-frame` marks the offending line with a leading `>` and points at the column with a
 * caret on the line below. The caret line is matched by shape — gutter pipe, then nothing but
 * carets — because a bare `includes('^')` also marks any source line holding a bitwise xor.
 */
const CARET_LINE = /^\s*\|\s*\^+/;

export function isMarkedCodeFrameLine(line: string): boolean {
  return line.startsWith('>') || CARET_LINE.test(line);
}
