import { Text, type StyleProp, type TextStyle } from 'react-native';

import { CodeHighlight } from './detail-panel/code-highlight';
import { JsonTree } from './detail-panel/json-tree';
import { detectLanguage } from '../../utils/network/code-highlight.util';
import type { JsonValue } from '../../utils/network/json-tree.util';

// Attempted regardless of the content-type header, since it's common for APIs to omit or
// mislabel it — a body that happens to parse as JSON is shown as JSON either way.
function parseJson(body: string): JsonValue | undefined {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

/** JSON tree if the body parses as JSON, else syntax-highlighted text — shared between the
 * Preview tab and the sandbox's response view so both render a body the same way. */
export function ResponseBodyPreview({
  body,
  mimeType,
  emptyText,
  emptyTextStyle,
}: {
  body: string | undefined;
  mimeType: string | undefined;
  emptyText: string;
  emptyTextStyle: StyleProp<TextStyle>;
}) {
  if (!body) return <Text style={emptyTextStyle}>{emptyText}</Text>;

  const parsed = parseJson(body);
  if (parsed !== undefined) return <JsonTree value={parsed} />;
  return <CodeHighlight code={body} language={detectLanguage(mimeType, body)} />;
}
