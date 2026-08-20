import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MONOSPACE } from '../../../core/constants/typography.const';
import { storageStore } from '../stores/storage.store';
import { makeThemedStyles, useThemeColors } from '../../../core/utils/themed-styles.util';
import { ReadOnlyTextInput } from '../../../core/components/ui/read-only-text-input.ui';

const SNIPPET = `import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';
import * as SecureStore from 'expo-secure-store';
import {
  createDevtoolsClient,
  asyncStorageAdapter,
  mmkvAdapter,
  secureStoreAdapter,
} from '@axonpack/expo-devtools';

const mmkv = new MMKV();

export const devtools = createDevtoolsClient({
  storage: {
    adapters: [
      asyncStorageAdapter({ driver: AsyncStorage }),
      mmkvAdapter({ driver: mmkv }),
      // SecureStore can't list its own keys, so you name them.
      secureStoreAdapter({ driver: SecureStore, keys: ['session'] }),
    ],
  },
});`;

export function EmptyState() {
  const styles = useStyles();
  const COLORS = useThemeColors();
  const enabled = useSyncExternalStore(storageStore.subscribe, storageStore.isEnabled);

  // Two different reasons for an empty tab, and they need different fixes. Naming the second one is
  // worth the branch: registering the adapters and never calling `init()` looks identical otherwise.
  if (!enabled) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.badge}>
          <MaterialIcons name="storage" size={22} color={COLORS.accent} />
        </View>

        <Text style={styles.title}>Devtools aren't running</Text>
        <Text style={styles.lede}>
          Nothing is captured, and no store is read, until devtools.init() runs. Call it once at app
          startup — that one call is the whole gate that keeps this package free to ship.
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

      <ReadOnlyTextInput value={SNIPPET} style={styles.snippet} />
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
    backgroundColor: COLORS.toolbarBackground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 8,
  },
}));
