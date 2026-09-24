import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ReadOnlyTextInput } from '../../../core/components/ui/read-only-text-input.ui';
import { MONOSPACE } from '../../../core/constants/typography.const';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { STORAGE_SETUP_SNIPPET } from '../constants/setup-snippet.const';
import { storageStore, useStorageStore } from '../stores/storage.store';

export function EmptyState() {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const enabled = useStorageStore(storageStore.isEnabled);

  // Two different reasons for an empty tab, and they need different fixes. Naming the second one is
  // worth the branch: registering the adapters with the devtools off looks identical otherwise.
  if (!enabled) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.badge}>
          <MaterialIcons name="storage" size={22} color={COLORS.accent} />
        </View>

        <Text style={styles.title}>Devtools aren't running</Text>
        <Text style={styles.lede}>
          Nothing is captured, and no store is read, until {'<DevtoolsProvider />'} starts a client
          with enabled: true. That one flag is the whole gate that keeps this package free to ship.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.badge}>
        <MaterialIcons name="storage" size={22} color={COLORS.accent} />
      </View>

      <Text style={styles.title}>No stores registered</Text>
      <Text style={styles.lede}>
        A key-value store is a separate install with its own native code, so this package holds no
        dependency on one and cannot find yours by itself. Hand it the store you already use and
        every key shows up here.
      </Text>

      <ReadOnlyTextInput value={STORAGE_SETUP_SNIPPET} style={styles.snippet} />
    </ScrollView>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
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
