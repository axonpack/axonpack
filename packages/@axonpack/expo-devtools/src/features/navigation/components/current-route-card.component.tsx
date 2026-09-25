import { StyleSheet, Text, View } from 'react-native';

import { JsonTree } from '../../../core/components/json-tree';
import { CollapsibleSection } from '../../../core/components/ui/collapsible-section.ui';
import { CopyIconButton } from '../../../core/components/ui/copy-icon-button.ui';
import { MONOSPACE } from '../../../core/constants/typography.const';
import type { JsonValue } from '../../../core/utils/json-tree.util';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import {
  navigationStore,
  useNavigationStore,
  type NavigationAttachment,
} from '../stores/navigation.store';

/** Which of the three layouts the tab is running on, so a setup question needs no code reading. */
const ATTACHMENT_LABELS: Record<NavigationAttachment, string> = {
  'expo-router': 'Expo Router',
  context: 'React Navigation, found from inside the container',
  hook: 'React Navigation, handed over with useDevtoolsNavigation',
};

/** What is on top right now, and the whole navigator state under it for when the top is not enough. */
export function CurrentRouteCard() {
  const styles = useStyles();
  const route = useNavigationStore(navigationStore.getCurrentRoute);
  const state = useNavigationStore(navigationStore.getRootState);
  const attachment = useNavigationStore(navigationStore.getAttachment);

  if (!route) return null;

  const params = route.params && Object.keys(route.params).length > 0 ? route.params : null;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>On screen</Text>
      <View style={styles.nameRow}>
        <Text style={styles.name} selectable>
          {route.name}
        </Text>
        <CopyIconButton value={route.path ?? route.name} />
      </View>
      {route.path && (
        <Text style={styles.path} selectable>
          {route.path}
        </Text>
      )}
      {attachment && <Text style={styles.attachment}>{ATTACHMENT_LABELS[attachment]}</Text>}

      {params && (
        <CollapsibleSection title="Params" initiallyExpanded={false}>
          <JsonTree value={params as unknown as JsonValue} />
        </CollapsibleSection>
      )}
      {state && (
        <CollapsibleSection title="Navigator state" initiallyExpanded={false}>
          <JsonTree value={state as unknown as JsonValue} defaultExpanded={false} />
        </CollapsibleSection>
      )}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  card: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: COLORS.textSecondary,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  path: {
    fontFamily: MONOSPACE,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  attachment: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 6,
  },
}));
