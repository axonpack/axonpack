import { ActivityIndicator, Text, View } from 'react-native';

import { useSandboxStyles } from './shared.styles';
import type { SandboxResult } from '../../utils/sandbox.util';
import { makeThemedStyles, useThemeColors } from '../../../../core/utils/themed-styles.util';
import { CollapsibleSection } from '../../../../core/components/ui/collapsible-section.ui';
import { ResponseBodyPreview } from '../response-body-preview.component';

export function ResponsePanel({
  sending,
  result,
}: {
  sending: boolean;
  result: SandboxResult | null;
}) {
  const sandboxStyles = useSandboxStyles();
  const styles = useStyles();
  const COLORS = useThemeColors();
  if (sending) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  if (!result) {
    return <Text style={sandboxStyles.emptyText}>Send a request to see the response here.</Text>;
  }

  if (!result.ok) {
    return (
      <View>
        <Text style={[styles.statusLine, { color: COLORS.error }]}>Request failed</Text>
        <Text style={styles.errorText} selectable>
          {result.error}
        </Text>
      </View>
    );
  }

  const statusColor = result.status >= 200 && result.status < 400 ? COLORS.success : COLORS.error;

  return (
    <View>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusLine, { color: statusColor }]}>
          {result.status} {result.statusText}
        </Text>
        <Text style={styles.durationText}>{result.duration} ms</Text>
      </View>
      <CollapsibleSection title="Response Headers" count={Object.keys(result.headers).length}>
        {Object.entries(result.headers).map(([key, value]) => (
          <View key={key} style={sandboxStyles.row}>
            <Text style={styles.headerKey} selectable>
              {key}
            </Text>
            <Text style={styles.headerValue} selectable>
              {value}
            </Text>
          </View>
        ))}
      </CollapsibleSection>
      <CollapsibleSection title="Response Body">
        <ResponseBodyPreview
          body={result.body}
          mimeType={result.headers['content-type']}
          url={result.url}
          emptyText="Empty response body"
          emptyTextStyle={sandboxStyles.emptyText}
        />
      </CollapsibleSection>
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  centered: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLine: {
    fontSize: 13,
    fontWeight: '700',
  },
  durationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 'auto',
  },
  errorText: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  headerKey: {
    width: 140,
    fontSize: 12,
    color: COLORS.keyAccent,
    fontWeight: '600',
  },
  headerValue: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
}));
