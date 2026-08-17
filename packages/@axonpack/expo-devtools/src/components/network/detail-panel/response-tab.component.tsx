import { StyleSheet, Text, View } from 'react-native';

import { useRowStyles } from './shared.styles';
import type { NetworkLogEntry } from '../../../stores/network/network-log.store';
import { findMatches, type Matcher } from '../../../utils/text-search.util';
import { CopyIconButton } from '../../ui/copy-icon-button.ui';
import { HighlightedText } from '../../ui/highlighted-text.ui';

export function ResponseTab({
  entry,
  matcher = null,
}: {
  entry: NetworkLogEntry;
  matcher?: Matcher | null;
}) {
  const rowStyles = useRowStyles();
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
      {/* Text, not a TextInput: RN cannot paint a background behind a range of an input's value. */}
      <HighlightedText
        text={entry.responseBody}
        ranges={findMatches(entry.responseBody, matcher)}
        style={rowStyles.monospace}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
