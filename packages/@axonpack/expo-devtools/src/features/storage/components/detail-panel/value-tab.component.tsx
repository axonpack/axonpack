import { Text, View } from 'react-native';

import { useDetailStyles } from './shared.styles';
import type { StorageEntry } from '../../stores/storage.store';
import { isTreeValue, parseStoredJson } from '../../utils/classify-value.util';
import { findMatches, type Matcher } from '../../../../core/utils/text-search.util';
import { JsonTree } from '../../../../core/components/json-tree';
import { CopyIconButton } from '../../../../core/components/ui/copy-icon-button.ui';
import { HighlightedText } from '../../../../core/components/ui/highlighted-text.ui';

export function ValueTab({
  entry,
  matcher = null,
}: {
  entry: StorageEntry;
  matcher?: Matcher | null;
}) {
  const styles = useDetailStyles();

  if (entry.error !== undefined) {
    return (
      <View style={styles.section}>
        <Text style={styles.error}>{entry.error}</Text>
      </View>
    );
  }

  if (entry.text === null) {
    return (
      <View style={styles.section}>
        <Text style={styles.emptyText}>This key holds no value.</Text>
      </View>
    );
  }

  if (entry.kind === 'buffer') {
    return (
      <View style={styles.section}>
        <Text style={styles.emptyText}>Binary — {entry.text}</Text>
        <Text style={styles.note}>
          There is no text form of these bytes to show, so only their length is reported.
        </Text>
      </View>
    );
  }

  const parsed = parseStoredJson(entry.text);

  return (
    <View style={styles.section}>
      <View style={styles.toolbar}>
        <CopyIconButton value={entry.text} />
      </View>
      {isTreeValue(parsed) ? (
        <JsonTree value={parsed} matcher={matcher} />
      ) : (
        // Text, not a TextInput: RN cannot paint a background behind a range of an input's value.
        <HighlightedText
          text={entry.text}
          ranges={findMatches(entry.text, matcher)}
          style={styles.monospace}
        />
      )}
    </View>
  );
}
