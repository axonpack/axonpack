import { Text, View } from 'react-native';

import { useRowStyles } from './shared.styles';
import type { ResolvedNetworkConditions } from '../../stores/network-conditions.store';
import {
  formatThrottleSummary,
  formatUserAgentSummary,
} from '../../utils/network-conditions.util';
import { makeThemedStyles } from '../../../../core/utils/themed-styles.util';
import { CollapsibleSection } from '../../../../core/components/ui/collapsible-section.ui';

export function NetworkConditionsSection({
  conditions,
}: {
  conditions: ResolvedNetworkConditions;
}) {
  const rowStyles = useRowStyles();
  const styles = useStyles();
  const isThrottled = conditions.offline || conditions.throttle !== null;
  const hasUserAgentOverride = conditions.userAgent !== null;

  return (
    <CollapsibleSection title="Network Conditions">
      <View style={rowStyles.headerRow}>
        <Text style={rowStyles.headerListKey} selectable>
          Throttling
        </Text>
        <Text
          style={[
            rowStyles.headerValue,
            conditions.offline && styles.offline,
            isThrottled && !conditions.offline && styles.active,
          ]}
          selectable>
          {formatThrottleSummary(conditions)}
        </Text>
      </View>
      <View style={rowStyles.headerRow}>
        <Text style={rowStyles.headerListKey} selectable>
          User Agent
        </Text>
        <Text style={[rowStyles.headerValue, hasUserAgentOverride && styles.active]} selectable>
          {formatUserAgentSummary(conditions)}
        </Text>
      </View>
      {conditions.userAgent && (
        <View style={rowStyles.headerRow}>
          <Text style={rowStyles.headerListKey} selectable>
            Agent String
          </Text>
          <Text style={rowStyles.headerValue} selectable>
            {conditions.userAgent}
          </Text>
        </View>
      )}
    </CollapsibleSection>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  active: {
    color: COLORS.warning,
    fontWeight: '600',
  },
  offline: {
    color: COLORS.error,
    fontWeight: '600',
  },
}));
