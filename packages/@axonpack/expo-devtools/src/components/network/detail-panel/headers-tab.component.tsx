import { StyleSheet, Text, View } from 'react-native';

import { HeaderList } from './header-list.component';
import { NetworkConditionsSection } from './network-conditions-section.component';
import { rowStyles } from './shared.styles';
import type { NetworkLogEntry } from '../../../stores/network/network-log.store';
import {
  formatSource,
  getStatusColor,
  getStatusText,
} from '../../../utils/network/formatters.util';
import { CollapsibleSection } from '../../ui/collapsible-section.ui';
import { CopyIconButton } from '../../ui/copy-icon-button.ui';

function formatStatus(entry: NetworkLogEntry): string {
  if (entry.statusCode === undefined) return entry.error ?? '(pending)';
  const statusText = getStatusText(entry.statusCode, entry.statusText);
  return statusText ? `${entry.statusCode} ${statusText}` : `${entry.statusCode}`;
}

function GeneralRow({
  label,
  value,
  stacked,
  children,
}: {
  label: string;
  value: string;
  stacked: boolean;
  children?: React.ReactNode;
}) {
  const displayValue = children ?? (
    <Text style={stacked ? rowStyles.stackedValue : rowStyles.headerValue} selectable>
      {value}
    </Text>
  );

  if (stacked) {
    return (
      <View style={rowStyles.stackedRow}>
        <View style={rowStyles.stackedTopRow}>
          <Text style={rowStyles.stackedKey} selectable>
            {label}
          </Text>
          <CopyIconButton value={value} />
        </View>
        {displayValue}
      </View>
    );
  }

  return (
    <View style={rowStyles.headerRow}>
      <Text style={rowStyles.headerListKey} selectable>
        {label}
      </Text>
      {displayValue}
      <CopyIconButton value={value} />
    </View>
  );
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
      {entry.conditions && <NetworkConditionsSection conditions={entry.conditions} />}
      <CollapsibleSection title="General">
        <GeneralRow label="Request URL" value={entry.url} stacked={stackedHeaders} />
        <GeneralRow label="Request Method" value={entry.method} stacked={stackedHeaders} />
        <GeneralRow label="Status Code" value={formatStatus(entry)} stacked={stackedHeaders}>
          <View style={styles.statusValue}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(entry.status, entry.statusCode) },
              ]}
            />
            <Text style={rowStyles.headerValue} selectable>
              {formatStatus(entry)}
            </Text>
          </View>
        </GeneralRow>
        {entry.source && (
          <GeneralRow label="Source" value={formatSource(entry.source)} stacked={stackedHeaders} />
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
