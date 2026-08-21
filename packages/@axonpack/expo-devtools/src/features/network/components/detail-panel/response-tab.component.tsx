import { StyleSheet, Text, View } from 'react-native';

import { useRowStyles } from './shared.styles';
import type { NetworkLogEntry } from '../../stores/network-log.store';
import { findMatches, type Matcher } from '../../../../core/utils/text-search.util';
import { CopyIconButton } from '../../../../core/components/ui/copy-icon-button.ui';
import { HighlightedText } from '../../../../core/components/ui/highlighted-text.ui';
import { HexView } from '../../../../core/components/ui/hex-view.ui';
import { formatSize } from '../../../../core/utils/format-bytes.util';

export function ResponseTab({
  entry,
  matcher = null,
}: {
  entry: NetworkLogEntry;
  matcher?: Matcher | null;
}) {
  const rowStyles = useRowStyles();

  // Bytes rather than text: a hex dump is the only honest rendering of a body that is not text, and
  // the reason this tab no longer says "no response body" for every image that came back.
  if (entry.responseBase64) {
    return (
      <View style={rowStyles.section}>
        <HexView base64={entry.responseBase64} />
      </View>
    );
  }

  if (entry.bodyOmitted) {
    return (
      <View style={rowStyles.section}>
        <Text style={rowStyles.emptyText}>
          {entry.bodyOmitted === 'too-large'
            ? `The body was too large to keep${entry.size !== undefined ? ` (${formatSize(entry.size)})` : ''}, so its bytes were not stored.`
            : 'The body could not be read.'}
        </Text>
      </View>
    );
  }

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
