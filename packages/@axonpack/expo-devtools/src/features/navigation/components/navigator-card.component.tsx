import { StyleSheet, Text, View } from 'react-native';

import { NavigatorOutline } from './navigator-outline.component';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import { navigationStore, useNavigationStore } from '../stores/navigation.store';
import { hostedContainers, topContainers } from '../utils/flatten-navigator.util';

/**
 * Every container drawn as one tree: a container started inside a screen of another hangs under
 * that screen, so only the ones no screen hosts start a track of their own. The route on screen is
 * marked on the track itself, with its Back beside it, so there is no summary above to repeat it.
 */
export function NavigatorCard() {
  const styles = useStyles();
  const containers = useNavigationStore(navigationStore.getContainers);

  if (containers.length === 0) return null;

  const hosted = hostedContainers(containers);
  const tops = topContainers(containers);

  return (
    <View style={styles.card}>
      {tops.map((top) =>
        top.state ? (
          <NavigatorOutline
            key={top.name}
            state={top.state}
            currentKey={top.route?.key}
            hosted={hosted}
            container={top.name}
          />
        ) : (
          <Text key={top.name} style={styles.waiting}>
            {top.name}: no navigator mounted in it yet.
          </Text>
        )
      )}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  card: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  waiting: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
}));
