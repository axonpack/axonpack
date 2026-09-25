import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { JsonTree } from '../../../core/components/json-tree';
import { Chip } from '../../../core/components/ui/chip.ui';
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

/** Which of the three layouts a container came in by, so a setup question needs no code reading. */
const ATTACHMENT_LABELS: Record<NavigationAttachment, string> = {
  'expo-router': 'Expo Router',
  context: 'React Navigation, found from inside the container',
  hook: 'React Navigation, handed over with useDevtoolsNavigation',
};

/**
 * What is on top of the focused container right now, and the whole navigator state under it for
 * when the top is not enough. With more than one container attached, a chip row picks which one
 * the card shows and the toolbar acts on.
 */
export function CurrentRouteCard() {
  const styles = useStyles();
  const containers = useNavigationStore(navigationStore.getContainers);
  const focused = useNavigationStore(navigationStore.getFocusedContainer);

  if (!focused) return null;

  const { route, state } = focused;
  const params = route?.params && Object.keys(route.params).length > 0 ? route.params : null;

  return (
    <View style={styles.card}>
      {containers.length > 1 && (
        // One line that scrolls rather than a row that wraps: a container has a short name, and a
        // card that grows a line per container pushes the route it is there to show off screen.
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chips}
          contentContainerStyle={styles.chipsContent}
          keyboardShouldPersistTaps="handled">
          {containers.map((container) => (
            <Chip
              key={container.name}
              icon="account-tree"
              label={container.name}
              active={container.name === focused.name}
              onPress={() => navigationStore.setFocused(container.name)}
            />
          ))}
        </ScrollView>
      )}

      <Text style={styles.label}>On screen</Text>
      {route ? (
        <>
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
        </>
      ) : (
        <Text style={styles.waiting}>Nothing yet: the navigator has not mounted.</Text>
      )}
      <Text style={styles.attachment}>
        {focused.name} · {ATTACHMENT_LABELS[focused.via]}
      </Text>

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
  chips: {
    flexGrow: 0,
    marginHorizontal: -12,
    marginBottom: 10,
  },
  chipsContent: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
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
  waiting: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  attachment: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 6,
  },
}));
