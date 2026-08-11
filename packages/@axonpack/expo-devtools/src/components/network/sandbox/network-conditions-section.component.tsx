import { StyleSheet, Text } from 'react-native';

import { COLORS } from '../../../constants/colors.const';
import { CollapsibleSection } from '../../ui/collapsible-section.ui';
import { ThrottleSelector } from '../throttle-selector.component';
import { UserAgentSelector } from '../user-agent-selector.component';

export function NetworkConditionsSection() {
  return (
    <CollapsibleSection title="Network Conditions">
      <Text style={styles.note}>
        These are shared with the whole app. Changing them here affects every request, not just this
        one.
      </Text>
      <ThrottleSelector />
      <UserAgentSelector />
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  note: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
});
