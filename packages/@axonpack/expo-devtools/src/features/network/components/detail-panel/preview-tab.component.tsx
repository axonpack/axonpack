import { StyleSheet, View } from 'react-native';

import { useRowStyles } from './shared.styles';
import { CopyIconButton } from '../../../../core/components/ui/copy-icon-button.ui';
import { XmlTree } from '../../../../core/components/xml-tree';
import type { Matcher } from '../../../../core/utils/text-search.util';
import type { NetworkLogEntry } from '../../stores/network-log.store';
import { classifyPreview } from '../../utils/preview-kind.util';
import { ResponseBodyPreview } from '../response-body-preview.component';

export function PreviewTab({
  entry,
  matcher = null,
}: {
  entry: NetworkLogEntry;
  matcher?: Matcher | null;
}) {
  const rowStyles = useRowStyles();
  // XML is structure, so it is shown as one. Everything else keeps whatever rendering its type earns.
  const asTree = classifyPreview(entry.mimeType) === 'xml' && entry.responseBody !== undefined;

  return (
    <View style={rowStyles.section}>
      {entry.responseBody && (
        <View style={styles.toolbar}>
          <CopyIconButton value={entry.responseBody} />
        </View>
      )}
      {asTree ? (
        <XmlTree source={entry.responseBody as string} />
      ) : (
        <ResponseBodyPreviewBlock entry={entry} matcher={matcher} rowStyles={rowStyles} />
      )}
    </View>
  );
}

/** Split out so the tab reads as the one choice it makes. */
function ResponseBodyPreviewBlock({
  entry,
  matcher,
  rowStyles,
}: {
  entry: NetworkLogEntry;
  matcher: Matcher | null;
  rowStyles: { emptyText: object };
}) {
  return (
    <ResponseBodyPreview
      body={entry.responseBody}
      base64={entry.responseBase64}
      mimeType={entry.mimeType}
      url={entry.url}
      emptyText="No preview available"
      emptyTextStyle={rowStyles.emptyText}
      matcher={matcher}
    />
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
