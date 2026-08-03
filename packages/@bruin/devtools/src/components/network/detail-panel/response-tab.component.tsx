import { Text, View } from 'react-native';

import { rowStyles } from './shared.styles';
import type { NetworkLogEntry } from '../../../stores/network/network-log.store';
import { ReadOnlyTextInput } from '../../ui/read-only-text-input.ui';

export function ResponseTab({ entry }: { entry: NetworkLogEntry }) {
  return (
    <View style={rowStyles.section}>
      {entry.responseBody ? (
        <ReadOnlyTextInput value={entry.responseBody} style={rowStyles.monospace} />
      ) : (
        <Text style={rowStyles.emptyText}>No response body</Text>
      )}
    </View>
  );
}
