import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  asyncStorageAdapter,
  createDevtoolsClient,
  defineStorageAdapter,
  mmkvAdapter,
  secureStoreAdapter,
} from '@axonpack/expo-devtools';
import * as SecureStore from 'expo-secure-store';
import { createMMKV } from 'react-native-mmkv';

/**
 * MMKV's native module isn't in Expo Go and `createMMKV()` throws without it, so the example drops to
 * the other three stores rather than crashing at import. `bun run ios` gets you the real thing.
 */
function openMmkv() {
  try {
    return createMMKV({ id: 'devtools-example' });
  } catch {
    return null;
  }
}

export const mmkv = openMmkv();

/** Proves the escape hatch: a store of our own, no native dependency involved. */
export const memoryStore = new Map<string, string>();

export const SECURE_KEYS = ['session', 'pin'];

export const devtools = createDevtoolsClient({
  defaultTheme: 'dark',
  themes: {
    midnight: { base: 'dark', colors: { accent: '#a78bfa' } },
  },
  webviewSources: ['example-webview', 'test2', 'page-apis'],
  network: {
    disabledByDefault: false,
    includeFetch: true,
    includeXmlHttpRequest: true,
  },
  console: {
    disabledByDefault: false,
    context: {
      appInfo: { name: 'devtools-example', platform: 'expo', tabs: ['requests', 'console'] },
      double: (value: number) => value * 2,
    },
  },
  /**
   * `enableWhileDevtoolsDisabled` is what a real app would pair with `enabled: __DEV__`: `init()` is
   * then safe to call unconditionally, and a release build installs the crash handlers and nothing
   * else — no panel, no REPL, no request bodies. The example leaves the rest on so every tab works.
   */
  crash: {
    enableWhileDevtoolsDisabled: true,
    breadcrumbs: true,
    redact: (record) => ({
      ...record,
      message: record.message.replace(/token[=:]\s*\S+/gi, 'token=[redacted]'),
    }),
    onCrash: (record) => {},
  },
  storage: {
    adapters: [
      asyncStorageAdapter({ driver: AsyncStorage }),
      ...(mmkv ? [mmkvAdapter({ driver: mmkv })] : []),
      // SecureStore cannot list its own keys, so it is told which ones to watch.
      secureStoreAdapter({ driver: SecureStore, keys: SECURE_KEYS }),
      defineStorageAdapter({
        name: 'In-memory',
        kind: 'sync',
        getAllKeys: () => [...memoryStore.keys()],
        getItem: (key) => memoryStore.get(key) ?? null,
        setItem: (key, text) => {
          memoryStore.set(key, text);
        },
        removeItem: (key) => {
          memoryStore.delete(key);
        },
      }),
    ],
    maxKeys: 1000,
  },
});
