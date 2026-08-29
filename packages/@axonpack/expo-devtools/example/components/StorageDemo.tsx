import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from './ActionButton';
import { memoryStore, mmkv, SECURE_KEYS } from '../devtools';

const SEED = {
  'auth:token': 'eyJhbGciOiJIUzI1NiJ9.short.demo',
  'auth:refresh': 'refresh-token-value',
  'cache/user/1': JSON.stringify({ id: 1, name: 'Ada Lovelace', roles: ['admin', 'editor'] }),
  'cache/user/2': JSON.stringify({ id: 2, name: 'Grace Hopper', roles: [] }),
  'cache/feed': JSON.stringify([
    { id: 'a', title: 'First post', tags: ['news'] },
    { id: 'b', title: 'Second post', tags: [] },
  ]),
  'settings.theme': 'dark',
  'settings.locale': 'en-GB',
  greeting: 'Hello, café 🚀',
  blank: '',
  broken_json: '{"unclosed": true',
};

async function seedAsyncStorage() {
  for (const [key, value] of Object.entries(SEED)) {
    await AsyncStorage.setItem(key, value);
  }
}

/** `mmkv` is null in Expo Go, where its native module doesn't exist. */
function requireMmkv() {
  if (!mmkv) throw new Error('MMKV needs a dev build — run `bun run ios`.');
  return mmkv;
}

function seedMmkv() {
  const store = requireMmkv();
  for (const [key, value] of Object.entries(SEED)) store.set(key, value);
  // The typed values MMKV can hold that a string-only store cannot.
  store.set('counter', 42);
  store.set('flags.beta', true);
  store.set('flags.off', false);
  store.set('zero', 0);
}

function seedMemory() {
  for (const [key, value] of Object.entries(SEED)) memoryStore.set(key, value);
  // Blacklisted in `devtools.ts`: written here, and the tab should never show it.
  memoryStore.set('secret.api-key', 'sk-live-do-not-show');
}

async function seedSecureStore() {
  await SecureStore.setItemAsync(SECURE_KEYS[0], 'secure-session-value');
  await SecureStore.setItemAsync(SECURE_KEYS[1], '1234');
}

async function floodAsyncStorage() {
  for (let index = 0; index < 1200; index += 1) {
    await AsyncStorage.setItem(`flood:key-${String(index).padStart(4, '0')}`, `value ${index}`);
  }
}

export function StorageDemo() {
  const [status, setStatus] = useState('Nothing written yet.');

  async function run(label: string, action: () => void | Promise<void>) {
    setStatus(`${label}…`);
    try {
      await action();
      setStatus(`${label} — done. Open the panel's Storage tab and refresh.`);
    } catch (error) {
      setStatus(`${label} — failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Seed the stores</Text>
      <Text style={styles.hint}>
        Writes the same spread of values — JSON objects and arrays, long strings, an empty string,
        unparseable JSON, namespaced keys — into each registered store.
      </Text>
      <View style={styles.row}>
        <ActionButton
          label="Seed AsyncStorage"
          onPress={() => run('Seed AsyncStorage', seedAsyncStorage)}
        />
        <ActionButton label="Seed MMKV" onPress={() => run('Seed MMKV', seedMmkv)} />
        <ActionButton
          label="Seed SecureStore"
          onPress={() => run('Seed SecureStore', seedSecureStore)}
        />
        <ActionButton label="Seed in-memory" onPress={() => run('Seed in-memory', seedMemory)} />
      </View>

      <Text style={styles.heading}>Typed values</Text>
      <Text style={styles.hint}>
        MMKV stores numbers and booleans natively. The tab reads each key's type by probing, so a
        stored 0 shows as a number and not as an empty value.
      </Text>
      <View style={styles.row}>
        <ActionButton
          label="Bump MMKV counter"
          onPress={() =>
            run('Bump counter', () => {
              const store = requireMmkv();
              store.set('counter', (store.getNumber('counter') ?? 0) + 1);
            })
          }
        />
        <ActionButton
          label="Toggle MMKV flag"
          onPress={() =>
            run('Toggle flag', () => {
              const store = requireMmkv();
              store.set('flags.beta', !(store.getBoolean('flags.beta') ?? false));
            })
          }
        />
      </View>

      <Text style={styles.heading}>Mutate and remove</Text>
      <View style={styles.row}>
        <ActionButton
          label="Rewrite auth:token"
          onPress={() =>
            run('Rewrite auth:token', () =>
              AsyncStorage.setItem('auth:token', `rotated-at-${Date.now()}`)
            )
          }
        />
        <ActionButton
          label="Remove cache/feed"
          onPress={() => run('Remove cache/feed', () => AsyncStorage.removeItem('cache/feed'))}
        />
        <ActionButton
          label="Remove MMKV counter"
          onPress={() =>
            run('Remove MMKV counter', () => {
              requireMmkv().remove('counter');
            })
          }
        />
      </View>

      <Text style={styles.heading}>Past the cap</Text>
      <Text style={styles.hint}>
        Writes 1,200 keys — more than the 1,000-key read cap, so the tab says how many it skipped
        instead of quietly showing a short list.
      </Text>
      <View style={styles.row}>
        <ActionButton
          label="Write 1,200 keys"
          onPress={() => run('Write 1,200 keys', floodAsyncStorage)}
        />
        <ActionButton
          label="Clear AsyncStorage"
          onPress={() => run('Clear AsyncStorage', () => AsyncStorage.clear())}
        />
      </View>

      <Text style={styles.status}>{status}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 8,
  },
  heading: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#11181c',
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    color: '#687076',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  status: {
    marginTop: 16,
    fontSize: 12,
    color: '#687076',
  },
});
