import { StyleSheet, Text } from 'react-native';

import { COLORS } from '../../../constants/colors.const';
import { CollapsibleSection } from '../../ui/collapsible-section.ui';
import { ThrottleSelector } from '../throttle-selector.component';
import { UserAgentSelector } from '../user-agent-selector.component';

export function NetworkConditionsSection() {
  return (
    <CollapsibleSection title="Network Conditions">
      <Text style={styles.note}>
        Send goes through the same patched fetch as the rest of the app, so these are the app-wide
        settings — changing them here changes them everywhere, not just for this request.
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
