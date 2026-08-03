import { Text, View } from 'react-native';

import { JsonTree } from './json-tree';
import type { JsonValue } from './json-tree/json-tree.util';
import { rowStyles } from './shared.styles';
import type { NetworkLogEntry } from '../../../stores/network/network-log.store';

// Attempted regardless of the content-type header, since it's common for APIs to omit or
// mislabel it — a body that happens to parse as JSON is shown as JSON either way.
function parseJson(body: string | undefined): JsonValue | undefined {
  if (!body) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

export function PreviewTab({ entry }: { entry: NetworkLogEntry }) {
  const parsed = parseJson(entry.responseBody);

  return (
    <View style={rowStyles.section}>
      {parsed !== undefined ? (
        <JsonTree value={parsed} />
      ) : entry.responseBody ? (
        <Text style={rowStyles.monospace} selectable>
          {entry.responseBody}
        </Text>
      ) : (
        <Text style={rowStyles.emptyText}>No preview available</Text>
      )}
    </View>
  );
}
