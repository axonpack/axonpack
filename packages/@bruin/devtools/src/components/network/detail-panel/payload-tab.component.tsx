import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { JsonTree } from './json-tree';
import type { JsonValue } from './json-tree/json-tree.util';
import { rowStyles } from './shared.styles';
import { COLORS } from '../../../constants/colors.const';
import type { NetworkLogEntry } from '../../../stores/network/network-log.store';
import { CollapsibleSection } from '../../ui/collapsible-section.ui';
import { ReadOnlyTextInput } from '../../ui/read-only-text-input.ui';
import { ShareIconButton } from '../../ui/share-icon-button.ui';

// Attempted regardless of the request's content-type, same rationale as the Preview tab.
function parseJson(body: string | undefined): JsonValue | undefined {
  if (!body) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

export function PayloadTab({ entry }: { entry: NetworkLogEntry }) {
  const [viewSource, setViewSource] = useState(false);

  if (!entry.requestBody) {
    return <Text style={rowStyles.emptyText}>No request payload</Text>;
  }

  const parsed = parseJson(entry.requestBody);
  const showSource = viewSource || parsed === undefined;

  return (
    <CollapsibleSection
      title="Request Payload"
      headerRight={
        <View style={styles.headerRight}>
          {parsed !== undefined && (
            <TouchableOpacity onPress={() => setViewSource((prev) => !prev)} hitSlop={8}>
              <Text style={styles.toggle}>{showSource ? 'View parsed' : 'View source'}</Text>
            </TouchableOpacity>
          )}
          <ShareIconButton value={entry.requestBody} />
        </View>
      }>
      {showSource ? (
        <ReadOnlyTextInput value={entry.requestBody} style={rowStyles.monospace} />
      ) : (
        <JsonTree value={parsed} />
      )}
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
});
