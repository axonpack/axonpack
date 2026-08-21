import { Text, View } from 'react-native';

import { useRowStyles } from './shared.styles';
import { CollapsibleSection } from '../../../../core/components/ui/collapsible-section.ui';
import { CopyIconButton } from '../../../../core/components/ui/copy-icon-button.ui';

export function HeaderList({
  title,
  headers,
  stacked,
}: {
  title: string;
  headers: Record<string, string> | undefined;
  stacked: boolean;
}) {
  const rowStyles = useRowStyles();
  const entries = headers ? Object.entries(headers) : [];
  return (
    <CollapsibleSection title={title} count={entries.length}>
      {entries.length === 0 ? (
        <Text style={rowStyles.emptyText}>No headers captured</Text>
      ) : stacked ? (
        entries.map(([key, value]) => (
          <View key={key} style={rowStyles.stackedRow}>
            <View style={rowStyles.stackedTopRow}>
              <Text style={rowStyles.stackedKey} selectable>
                {key}
              </Text>
              <CopyIconButton value={value} />
            </View>
            <Text style={rowStyles.stackedValue} selectable>
              {value}
            </Text>
          </View>
        ))
      ) : (
        entries.map(([key, value]) => (
          <View key={key} style={rowStyles.headerRow}>
            <Text style={rowStyles.headerListKey} selectable>
              {key}
            </Text>
            <Text style={rowStyles.headerValue} selectable>
              {value}
            </Text>
            <CopyIconButton value={value} />
          </View>
        ))
      )}
    </CollapsibleSection>
  );
}
