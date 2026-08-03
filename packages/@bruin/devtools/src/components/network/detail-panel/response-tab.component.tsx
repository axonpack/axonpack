import { StyleSheet, Text, TextInput, View } from 'react-native';

import { rowStyles } from './shared.styles';
import type { NetworkLogEntry } from '../../../stores/network/network-log.store';

function blockEdits() {
  // Controlled TextInput with a no-op onChangeText: any keystroke gets discarded on
  // re-render since the value always snaps back to responseBody, but cursor movement,
  // selection, and copy still work natively — unlike `editable={false}`, which blocks those too.
}

export function ResponseTab({ entry }: { entry: NetworkLogEntry }) {
  return (
    <View style={rowStyles.section}>
      {entry.responseBody ? (
        <TextInput
          style={[rowStyles.monospace, styles.input]}
          value={entry.responseBody}
          onChangeText={blockEdits}
          multiline
          editable
        />
      ) : (
        <Text style={rowStyles.emptyText}>No response body</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    padding: 0,
    textAlignVertical: 'top',
  },
});
