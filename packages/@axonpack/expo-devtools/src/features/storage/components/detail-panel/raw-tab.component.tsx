import { Text, View } from 'react-native';

import { useDetailStyles } from './shared.styles';
import type { StorageEntry } from '../../stores/storage.store';
import { formatSize } from '../../../../core/utils/format-bytes.util';
import { findMatches, type Matcher } from '../../../../core/utils/text-search.util';
import { CopyIconButton } from '../../../../core/components/ui/copy-icon-button.ui';
import { HighlightedText } from '../../../../core/components/ui/highlighted-text.ui';

/** The characters exactly as stored — no parsing, no pretty-printing. */
export function RawTab({
  entry,
  matcher = null,
}: {
  entry: StorageEntry;
  matcher?: Matcher | null;
}) {
  const styles = useDetailStyles();

  if (entry.text === null) {
    return (
      <View style={styles.section}>
        <Text style={styles.emptyText}>This key holds no value.</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.toolbar}>
        <Text style={styles.toolbarNote}>
          {entry.text.length} characters · {formatSize(entry.size)}
        </Text>
        <CopyIconButton value={entry.text} />
      </View>
      <HighlightedText
        text={entry.text}
        ranges={findMatches(entry.text, matcher)}
        style={styles.monospace}
      />
    </View>
  );
}
