import { StyleSheet, View } from 'react-native';

import { useRowStyles } from './shared.styles';
import type { NetworkLogEntry } from '../../../stores/network/network-log.store';
import type { Matcher } from '../../../utils/text-search.util';
import { CopyIconButton } from '../../ui/copy-icon-button.ui';
import { ResponseBodyPreview } from '../response-body-preview.component';

export function PreviewTab({
  entry,
  matcher = null,
}: {
  entry: NetworkLogEntry;
  matcher?: Matcher | null;
}) {
  const rowStyles = useRowStyles();
  return (
    <View style={rowStyles.section}>
      {entry.responseBody && (
        <View style={styles.toolbar}>
          <CopyIconButton value={entry.responseBody} />
        </View>
      )}
      <ResponseBodyPreview
        body={entry.responseBody}
        mimeType={entry.mimeType}
        url={entry.url}
        emptyText="No preview available"
        emptyTextStyle={rowStyles.emptyText}
        matcher={matcher}
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
