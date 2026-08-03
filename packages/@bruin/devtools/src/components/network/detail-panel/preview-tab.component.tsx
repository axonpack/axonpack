import { StyleSheet, Text, View } from 'react-native';

import { JsonTree } from './json-tree';
import type { JsonValue } from './json-tree/json-tree.util';
import { rowStyles } from './shared.styles';
import type { NetworkLogEntry } from '../../../stores/network/network-log.store';
import { ShareIconButton } from '../../ui/share-icon-button.ui';

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

  if (!entry.responseBody) {
    return (
      <View style={rowStyles.section}>
        <Text style={rowStyles.emptyText}>No preview available</Text>
      </View>
    );
  }

  return (
    <View style={rowStyles.section}>
      <View style={styles.toolbar}>
        <ShareIconButton value={entry.responseBody} />
      </View>
      {parsed !== undefined ? (
        <JsonTree value={parsed} />
      ) : (
        <Text style={rowStyles.monospace} selectable>
          {entry.responseBody}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
