/** A trailing `:line` or `:line:column`, which is the half of a location worth keeping. */
const TRAILING_POSITION = /:(\d+)(?::(\d+))?$/;
const URL_ORIGIN = /^[a-z][a-z\d+.-]*:\/\/[^/]*/i;
/** Metro appends its query as `?a=b`, or as `//&a=b` when the path already ended in a slash. */
const QUERY = /\?|\/\/&/;

export type FrameLocation = {
  /** The file exactly as the engine wrote it — origin and query included, which is what Metro maps. */
  file: string;
  lineNumber?: number;
  column?: number;
};

/**
 * Splits a frame's location into the file and the position inside it. Kept separate from the
 * display formatting below because symbolication needs the file *unshortened*: Metro resolves it
 * against the source map by its full URL.
 */
export function parseFrameLocation(location: string): FrameLocation {
  const trimmed = location.trim();
  const position = TRAILING_POSITION.exec(trimmed);
  if (!position) return { file: trimmed };

  return {
    file: trimmed.slice(0, position.index),
    lineNumber: Number(position[1]),
    column: position[2] === undefined ? undefined : Number(position[2]),
  };
}

/**
 * A frame's location is whatever the engine wrote, which in dev is the entire dev-server URL —
 * query string included. At panel width that clips off the right edge exactly where the line and
 * column are, so only the file and position are shown. The raw string is one tap away in the row
 * itself, and untouched in the Raw tab.
 */
export function formatFrameLocation(location: string): string {
  const trimmed = location.trim();
  if (trimmed.length === 0) return '';

  const { file } = parseFrameLocation(trimmed);
  const withoutQuery = file.split(QUERY)[0] ?? file;
  const basename = withoutQuery
    .replace(URL_ORIGIN, '')
    .split('/')
    .filter((segment) => segment.length > 0)
    .pop();

  // No file to name — `native`, or an origin with nothing after it. The original is more use than
  // a fragment of it.
  if (basename === undefined) return trimmed;

  return `${basename}${TRAILING_POSITION.exec(trimmed)?.[0] ?? ''}`;
}
