import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useRowStyles } from './shared.styles';
import { HIT_SLOP, TOUCH_TARGET } from '../../../../core/constants/metrics.const';
import type { NetworkLogEntry } from '../../stores/network-log.store';
import type { JsonValue } from '../../../../core/utils/json-tree.util';
import { findMatches, type Matcher } from '../../../../core/utils/text-search.util';
import { makeThemedStyles } from '../../../../core/utils/themed-styles.util';
import { JsonTree } from '../../../../core/components/json-tree';
import { CollapsibleSection } from '../../../../core/components/ui/collapsible-section.ui';
import { CopyIconButton } from '../../../../core/components/ui/copy-icon-button.ui';
import { HighlightedText } from '../../../../core/components/ui/highlighted-text.ui';

function parseJson(body: string | undefined): JsonValue | undefined {
  if (!body) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
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
