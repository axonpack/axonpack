import { StyleSheet, Text, View } from 'react-native';

import { HeaderList } from './header-list.component';
import { rowStyles } from './shared.styles';
import type { NetworkLogEntry } from '../../../stores/network/network-log.store';
import { getStatusColor, getStatusText } from '../../../utils/network/formatters.util';
import { CollapsibleSection } from '../../ui/collapsible-section.ui';

function formatStatus(entry: NetworkLogEntry): string {
  if (entry.statusCode === undefined) return entry.error ?? '(pending)';
  const statusText = getStatusText(entry.statusCode, entry.statusText);
  return statusText ? `${entry.statusCode} ${statusText}` : `${entry.statusCode}`;
}

export function HeadersTab({
  entry,
  stackedHeaders,
}: {
  entry: NetworkLogEntry;
  stackedHeaders: boolean;
}) {
  return (
    <View>
      <CollapsibleSection title="General">
        <View style={rowStyles.headerRow}>
          <Text style={rowStyles.headerListKey} selectable>
            Request URL
          </Text>
          <Text style={rowStyles.headerValue} selectable>
            {entry.url}
          </Text>
        </View>
        <View style={rowStyles.headerRow}>
          <Text style={rowStyles.headerListKey} selectable>
            Request Method
          </Text>
          <Text style={rowStyles.headerValue} selectable>
            {entry.method}
          </Text>
        </View>
        <View style={rowStyles.headerRow}>
          <Text style={rowStyles.headerListKey} selectable>
            Status Code
          </Text>
          <View style={styles.statusValue}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(entry.status) }]} />
            <Text style={rowStyles.headerValue} selectable>
              {formatStatus(entry)}
            </Text>
          </View>
        </View>
        {entry.source && (
          <View style={rowStyles.headerRow}>
            <Text style={rowStyles.headerListKey} selectable>
              Source
            </Text>
            <Text style={rowStyles.headerValue} selectable>
              {entry.source}
            </Text>
          </View>
        )}
      </CollapsibleSection>
      <HeaderList title="Request Headers" headers={entry.requestHeaders} stacked={stackedHeaders} />
      <HeaderList
        title="Response Headers"
        headers={entry.responseHeaders}
        stacked={stackedHeaders}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  statusValue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
