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
  defaultTheme: 'empathika',
  themes: {
    midnight: { base: 'dark', colors: { accent: '#a78bfa' } },

    empathika: {
      base: 'light',
      // The header is white, so the clock and icons over it have to be dark. The app's own light
      // status bar is restored when the panel closes.
      statusBarStyle: 'light',
      colors: {
        background: '#F1F1F1', // background
        toolbarBackground: '#2D5433', // tabBar — the header, and the fill behind every chip
        toolbarOverlay: '#ECF1ED', // green50 — the active-tab pill in WmsTabBar
        border: '#D7DBE6', // border
        sectionTint: '#ECF1ED', // green50
        textPrimary: '#4E4E4E', // text
        textSecondary: '#6E6E6E', // tabBarInactive — inactive tab labels, and all muted text
        accent: '#407648', // tabBarActive / primary — active tab, launcher, links, focus
        keyAccent: '#2D5433', // green700
        pending: '#DC8118', // orange500
        success: '#5AAE4A', // success
        error: '#EC0041', // error
        warning: '#E9A95B', // warning
        errorSurface: '#FDEAEC', // red50
        warningSurface: '#E9A95B1F', // warningBg — warning at 12%
        matchHighlight: '#EAB92559', // yellow500 at 35%
      },
    },
  },
  webviewSources: ['example-webview', 'test2', 'page-apis'],
  network: {
    disabledByDefault: false,
    // By kind of traffic, not by transport: requests, sockets and streams, however they were made.
    http: true,
    websocket: true,
    sse: true,
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
      // SecureStore cannot list its own keys, so it is told which ones to watch. Passed as a
      // function to show the other form: an app that keeps its own list is read on every refresh.
      secureStoreAdapter({ driver: SecureStore, keys: () => SECURE_KEYS }),
      defineStorageAdapter({
        name: 'In-memory',
        kind: 'sync',
        // Anything under `secret.` is never listed and never read — see `seedMemory`, which writes
        // one so the tab can be checked against it.
        blacklist: /^secret\./,
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
