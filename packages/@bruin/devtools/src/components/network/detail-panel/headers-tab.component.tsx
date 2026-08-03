import { StyleSheet, Text, View } from 'react-native';

import { CollapsibleSection } from './collapsible-section.ui';
import { HeaderList } from './header-list.component';
import { rowStyles } from './shared.styles';
import type { NetworkLogEntry } from '../../../stores/network/network-log.store';
import { getStatusColor, getStatusText } from '../../../utils/network/formatters.util';

function formatStatus(entry: NetworkLogEntry): string {
  if (entry.statusCode === undefined) return entry.error ?? '(pending)';
  const statusText = getStatusText(entry.statusCode, entry.statusText);
  return statusText ? `${entry.statusCode} ${statusText}` : `${entry.statusCode}`;
}

export function HeadersTab({ entry }: { entry: NetworkLogEntry }) {
  return (
    <View>
      <CollapsibleSection title="General">
        <View style={rowStyles.headerRow}>
          <Text style={rowStyles.headerKey} selectable>
            Request URL
          </Text>
          <Text style={rowStyles.headerValue} selectable>
            {entry.url}
          </Text>
        </View>
        <View style={rowStyles.headerRow}>
          <Text style={rowStyles.headerKey} selectable>
            Request Method
          </Text>
          <Text style={rowStyles.headerValue} selectable>
            {entry.method}
          </Text>
        </View>
        <View style={rowStyles.headerRow}>
          <Text style={rowStyles.headerKey} selectable>
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
            <Text style={rowStyles.headerKey} selectable>
              Source
            </Text>
            <Text style={rowStyles.headerValue} selectable>
              {entry.source}
            </Text>
          </View>
        )}
      </CollapsibleSection>
      <HeaderList title="Request Headers" headers={entry.requestHeaders} />
      <HeaderList title="Response Headers" headers={entry.responseHeaders} />
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
