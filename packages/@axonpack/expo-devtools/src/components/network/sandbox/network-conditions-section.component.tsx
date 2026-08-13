import { Text } from 'react-native';

import { makeThemedStyles } from '../../../utils/themed-styles.util';
import { CollapsibleSection } from '../../ui/collapsible-section.ui';
import { ThrottleSelector } from '../throttle-selector.component';
import { UserAgentSelector } from '../user-agent-selector.component';

export function NetworkConditionsSection() {
  const styles = useStyles();
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

const useStyles = makeThemedStyles((COLORS) => ({
  note: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
}));
