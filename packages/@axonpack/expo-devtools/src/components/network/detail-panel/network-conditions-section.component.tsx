import { StyleSheet, Text, View } from 'react-native';

import { rowStyles } from './shared.styles';
import { COLORS } from '../../../constants/colors.const';
import type { ResolvedNetworkConditions } from '../../../stores/network/network-conditions.store';
import {
  formatThrottleSummary,
  formatUserAgentSummary,
} from '../../../utils/network/network-conditions.util';
import { CollapsibleSection } from '../../ui/collapsible-section.ui';

export function NetworkConditionsSection({
  conditions,
}: {
  conditions: ResolvedNetworkConditions;
}) {
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

const styles = StyleSheet.create({
  // A non-default condition is worth spotting at a glance — it's the most likely explanation for
  // a request being unexpectedly slow or failing.
  active: {
    color: COLORS.warning,
    fontWeight: '600',
  },
  offline: {
    color: COLORS.error,
    fontWeight: '600',
  },
});
