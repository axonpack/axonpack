import { Alert, StyleSheet, Text, View } from 'react-native';

import { ContainerSelector } from './container-selector.component';
import { NavigatorOutline } from './navigator-outline.component';
import { CopyIconButton } from '../../../core/components/ui/copy-icon-button.ui';
import { IconButton } from '../../../core/components/ui/icon-button.ui';
import { HIT_SLOP } from '../../../core/constants/metrics.const';
import { MONOSPACE } from '../../../core/constants/typography.const';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { canGoBack, goBack } from '../services/attach-navigation.service';
import { navigationViewStore, useNavigationViewStore } from '../stores/navigation-view.store';
import { navigationStore, useNavigationStore } from '../stores/navigation.store';
import { hostedContainers, resolveOnScreen } from '../utils/flatten-navigator.util';

/**
 * One container at a time: the one picked in the dropdown, or the one that moved last until
 * something is picked. Its route on screen, its outline, and the two buttons that move it, all on
 * the same card, so what a button acts on is what the card is showing.
 */
export function NavigatorCard({ onNavigate }: { onNavigate: (container: string) => void }) {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const containers = useNavigationStore(navigationStore.getContainers);
  const latest = useNavigationStore(navigationStore.getFocusedContainer);
  const selectedName = useNavigationViewStore((state) => state.selectedContainer);

  // A picked container that has since gone falls back to the latest rather than to nothing.
  const active = containers.find((container) => container.name === selectedName) ?? latest;
  if (!active) return null;

  const hosted = hostedContainers(containers);
  // A route that hosts another container is not the screen; that container's route on top is.
  const shown = resolveOnScreen(active, hosted);
  const route = shown.route;
  // Read each render rather than subscribed to: the containers list re-renders on every move.
  const backPossible = canGoBack(active.name);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <ContainerSelector
          containers={containers}
          active={active}
          onChange={navigationViewStore.selectContainer}
        />
        <View style={styles.spacer} />
        <IconButton
          name="arrow-back"
          color={backPossible ? COLORS.textSecondary : COLORS.border}
          hitSlop={HIT_SLOP.dense}
          onPress={() => {
            const message = goBack(active.name);
            if (message !== null) Alert.alert('Could not go back', message);
          }}
          label={`Go back in ${active.name}`}
          dense
        />
        <IconButton
          name="navigation"
          color={COLORS.textSecondary}
          hitSlop={HIT_SLOP.dense}
          onPress={() => onNavigate(active.name)}
          label={`Navigate in ${active.name}`}
          dense
        />
      </View>

      <Text style={styles.label}>On screen{shown.name !== active.name ? ` · ` : ''}</Text>
      {route ? (
        <View style={styles.nameRow}>
          <View style={styles.nameGroup}>
            <Text style={styles.name} selectable>
              {route.name}
            </Text>
            {route.path && (
              <Text style={styles.path} selectable>
                {route.path}
              </Text>
            )}
          </View>
          <CopyIconButton value={route.path ?? route.name} />
        </View>
      ) : (
        <Text style={styles.waiting}>Nothing yet: the navigator has not mounted.</Text>
      )}

      {active.state && (
        <>
          <Text style={styles.label}>Navigator</Text>
          <NavigatorOutline
            state={active.state}
            currentKey={active.route?.key}
            hosted={hosted}
            container={active.name}
          />
        </>
      )}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  card: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 4,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spacer: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameGroup: {
    flex: 1,
    gap: 1,
  },
  name: {
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
  },
}));
