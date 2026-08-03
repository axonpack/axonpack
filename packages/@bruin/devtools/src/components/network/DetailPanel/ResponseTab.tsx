import { Text, View } from 'react-native';

import { rowStyles } from './sharedStyles';
import type { NetworkLogEntry } from '../../../utils/network/networkLogStore';

export function ResponseTab({ entry }: { entry: NetworkLogEntry }) {
  return (
    <View style={rowStyles.section}>
      {entry.responseBody ? (
        <Text style={rowStyles.monospace} selectable>
          {entry.responseBody}
        </Text>
      ) : (
        <Text style={rowStyles.emptyText}>No response body</Text>
      )}
    </View>
  );
}
