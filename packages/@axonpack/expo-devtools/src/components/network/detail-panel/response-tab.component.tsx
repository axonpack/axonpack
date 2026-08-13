import { StyleSheet, Text, View } from 'react-native';

import { rowStyles } from './shared.styles';
import type { NetworkLogEntry } from '../../../stores/network/network-log.store';
import { CopyIconButton } from '../../ui/copy-icon-button.ui';
import { ReadOnlyTextInput } from '../../ui/read-only-text-input.ui';

export function ResponseTab({ entry }: { entry: NetworkLogEntry }) {
  if (!entry.responseBody) {
    return (
      <View style={rowStyles.section}>
        <Text style={rowStyles.emptyText}>No response body</Text>
      </View>
    );
  }

  return (
    <View style={rowStyles.section}>
      <View style={styles.toolbar}>
        <CopyIconButton value={entry.responseBody} />
      </View>
      <ReadOnlyTextInput value={entry.responseBody} style={rowStyles.monospace} />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
