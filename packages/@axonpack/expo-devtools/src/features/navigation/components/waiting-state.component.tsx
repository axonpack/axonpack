import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ReadOnlyTextInput } from '../../../core/components/ui/read-only-text-input.ui';
import { MONOSPACE } from '../../../core/constants/typography.const';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { NAVIGATION_SETUP_SNIPPET } from '../constants/setup-snippet.const';
import { navigationStore, useNavigationStore } from '../stores/navigation.store';

/**
 * The tab before a navigator is attached. Which router was found decides what it says: Expo Router
 * is picked up on its own, so waiting there means its root has not mounted. React Navigation is
 * picked up from inside its container, so waiting there means the provider sits above the
 * container, and the snippet shows both ways out of that.
 */
export function WaitingState() {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const kind = useNavigationStore(navigationStore.getRouterKind);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled">
      <View style={styles.badge}>
        <MaterialIcons name="alt-route" size={22} color={COLORS.accent} />
      </View>

      {kind === 'expo-router' ? (
        <>
          <Text style={styles.title}>Waiting for Expo Router</Text>
          <Text style={styles.lede}>
            Expo Router is installed, and its navigator is picked up on its own once the router's
            root has mounted. If this stays, Expo Router is not what this app navigates with.
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.title}>Waiting for a navigation container</Text>
          <Text style={styles.lede}>
            React Navigation is installed. A container is found on its own when the provider sits
            inside it. With the provider above the container, hand the container's ref over with one
            hook.
          </Text>
          <ReadOnlyTextInput value={NAVIGATION_SETUP_SNIPPET} style={styles.snippet} />
        </>
      )}
    </ScrollView>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.sectionTint,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  lede: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  snippet: {
    alignSelf: 'stretch',
    marginTop: 6,
    padding: 10,
    fontSize: 11,
    fontFamily: MONOSPACE,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 8,
  },
}));
