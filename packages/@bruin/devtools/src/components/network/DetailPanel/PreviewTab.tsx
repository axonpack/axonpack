import { Text, View } from 'react-native';

import { rowStyles } from './sharedStyles';
import type { NetworkLogEntry } from '../../../utils/network/networkLogStore';

function prettyPrint(body: string | undefined, mimeType: string | undefined): string | null {
  if (!body) return null;
  if (mimeType?.includes('json')) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  // Attempt JSON pretty-printing even without an explicit content-type, since it's common
  // for APIs to omit or mislabel it.
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

export function PreviewTab({ entry }: { entry: NetworkLogEntry }) {
  const preview = prettyPrint(entry.responseBody, entry.mimeType);
  return (
    <View style={rowStyles.section}>
      {preview ? (
        <Text style={rowStyles.monospace} selectable>
          {preview}
        </Text>
      ) : (
        <Text style={rowStyles.emptyText}>No preview available</Text>
      )}
    </View>
  );
}
