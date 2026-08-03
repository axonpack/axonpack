import { StyleSheet, View } from 'react-native';

import { rowStyles } from './shared.styles';
import type { NetworkLogEntry } from '../../../stores/network/network-log.store';
import { ShareIconButton } from '../../ui/share-icon-button.ui';
import { ResponseBodyPreview } from '../response-body-preview.component';

export function PreviewTab({ entry }: { entry: NetworkLogEntry }) {
  return (
    <View style={rowStyles.section}>
      {entry.responseBody && (
        <View style={styles.toolbar}>
          <ShareIconButton value={entry.responseBody} />
        </View>
      )}
      <ResponseBodyPreview
        body={entry.responseBody}
        mimeType={entry.mimeType}
        emptyText="No preview available"
        emptyTextStyle={rowStyles.emptyText}
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
