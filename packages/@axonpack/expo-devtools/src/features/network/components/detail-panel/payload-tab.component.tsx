import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useRowStyles } from './shared.styles';
import { JsonTree } from '../../../../core/components/json-tree';
import { CollapsibleSection } from '../../../../core/components/ui/collapsible-section.ui';
import { CopyIconButton } from '../../../../core/components/ui/copy-icon-button.ui';
import { HighlightedText } from '../../../../core/components/ui/highlighted-text.ui';
import { HIT_SLOP, TOUCH_TARGET } from '../../../../core/constants/metrics.const';
import { formatSize } from '../../../../core/utils/format-bytes.util';
import type { JsonValue } from '../../../../core/utils/json-tree.util';
import { findMatches, type Matcher } from '../../../../core/utils/text-search.util';
import { makeThemedStyles } from '../../../../core/utils/themed-styles.util';
import type { NetworkLogEntry } from '../../stores/network-log.store';
import type { RequestField } from '../../utils/request-body.util';

function parseJson(body: string | undefined): JsonValue | undefined {
  if (!body) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

/** A file part carries no bytes here, so its name, type and size are the whole of what was sent. */
function describeFile(field: Extract<RequestField, { kind: 'file' }>): string {
  const parts = [field.fileName ?? '(unnamed file)'];
  if (field.contentType) parts.push(field.contentType);
  if (field.size !== undefined) parts.push(formatSize(field.size));
  return parts.join(' · ');
}

export function PayloadTab({
  entry,
  matcher = null,
}: {
  entry: NetworkLogEntry;
  matcher?: Matcher | null;
}) {
  const rowStyles = useRowStyles();
  const styles = useStyles();
  const [viewSource, setViewSource] = useState(false);

  // An upload's parts are the payload, and flattening them into one line loses which file went up.
  if (entry.requestFields?.length) {
    return (
      <View style={rowStyles.section}>
        {entry.requestFields.map((field, index) => (
          <View key={`${index}-${field.name}`} style={rowStyles.headerRow}>
            <Text style={rowStyles.headerListKey} selectable>
              {field.name}
            </Text>
            <Text style={rowStyles.headerValue} selectable>
              {field.kind === 'text' ? field.value : describeFile(field)}
            </Text>
          </View>
        ))}
      </View>
    );
  }

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
            <TouchableOpacity
              onPress={() => setViewSource((prev) => !prev)}
              hitSlop={HIT_SLOP.default}
              style={styles.toggleButton}>
              <Text style={styles.toggle}>{showSource ? 'View parsed' : 'View source'}</Text>
            </TouchableOpacity>
          )}
          <CopyIconButton value={entry.requestBody} />
        </View>
      }>
      {showSource ? (
        <HighlightedText
          text={entry.requestBody}
          ranges={findMatches(entry.requestBody, matcher)}
          style={rowStyles.monospace}
        />
      ) : (
        <JsonTree value={parsed} matcher={matcher} />
      )}
    </CollapsibleSection>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleButton: {
    minHeight: TOUCH_TARGET.row,
    justifyContent: 'center',
  },
  toggle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
}));
