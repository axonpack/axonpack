import { Text, View } from 'react-native';

import { CollapsibleSection } from './CollapsibleSection';
import { rowStyles } from './sharedStyles';

export function HeaderList({
  title,
  headers,
}: {
  title: string;
  headers: Record<string, string> | undefined;
}) {
  const entries = headers ? Object.entries(headers) : [];
  return (
    <CollapsibleSection title={title} count={entries.length}>
      {entries.length === 0 ? (
        <Text style={rowStyles.emptyText}>No headers captured</Text>
      ) : (
        entries.map(([key, value]) => (
          <View key={key} style={rowStyles.headerRow}>
            <Text style={rowStyles.headerKey} selectable>
              {key}
            </Text>
            <Text style={rowStyles.headerValue} selectable>
              {value}
            </Text>
          </View>
        ))
      )}
    </CollapsibleSection>
  );
}
