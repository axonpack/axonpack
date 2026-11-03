# Turning on the tabs that start off

Network, Console, Navigation (with Expo Router) and Crashes record with the provider alone. Storage,
Query and Redux stay `off` in `devtools topics` until the app hands them what to read. Every option
is on https://axonpack.dev/docs/expo-devtools/reference/provider.

Keep the config in its own file once it grows, and pass it to the provider:

```ts
// devtools.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import {
  asyncStorageAdapter,
  secureStoreAdapter,
} from "@axonpack/expo-devtools";
import type { DevtoolsConfig } from "@axonpack/expo-devtools";
import { queryClient } from "./query-client";

export const devtoolsConfig = {
  enabled: __DEV__,
  storage: {
    adapters: [
      asyncStorageAdapter({ driver: AsyncStorage }),
      secureStoreAdapter({ driver: SecureStore, keys: ["session"] }), // the keychain can't be listed
    ],
    redactKeys: ["authToken", /^session\./],
  },
  query: { client: queryClient }, // the same QueryClient you pass to QueryClientProvider
  network: { redactHeaders: ["x-api-key"] },
} satisfies DevtoolsConfig;
```

```tsx
<DevtoolsProvider config={devtoolsConfig}>
```

Import only the storage libraries the app already has. Each adapter takes the app's own instance and
the package depends on none of them.

- **Storage.** Nothing is discovered: only stores in `storage.adapters` are seen. There are also
  `mmkvAdapter({ driver: mmkv })` and `defineStorageAdapter({ name, getAllKeys, getItem, ... })`.
  MMKV and SecureStore need a development build; an adapter over an in-memory `Map` works in Expo Go.
- **Query.** `query: { client }` with the app's TanStack `QueryClient`.
- **Redux.** Add the enhancer after `applyMiddleware`:
  `configureStore({ reducer, enhancers: (getDefault) => getDefault().concat(devtoolsReduxEnhancer()) })`.
- **Navigation.** Expo Router is found on its own, and so is a React Navigation container the
  provider sits inside. For a container inside the provider, call
  `useDevtoolsNavigation(navigationRef)` in the component that owns it.
- **WebView.** `const webview = useDevtoolsWebView('checkout')`, then
  `<WebView {...webview} source={{ uri }} />` captures the page's requests and console.
- **Your own timings and crash context.** `devtools.mark('checkout')`, `devtools.measure('checkout')`
  and `devtools.setCrashContext({ userId })`, from `import { devtools } from '@axonpack/expo-devtools'`.
- **Your own trigger.** `showFloatingButton={false}` on the provider, then
  `const panel = useDevtoolsPanel()` and `panel.toggle()`. Hide the trigger when `panel.enabled` is
  false.
- **Redaction.** `network.redactHeaders`, `network.redact`, `storage.redactKeys`, `storage.redact`,
  `navigation.redact` and `crash.redact` mask values in the panel and in every `devtools` reply.

Check: after a reload, `devtools topics` no longer shows `off` for what you set up.

Guides: [Storage](https://axonpack.dev/docs/expo-devtools/storage),
[Navigation](https://axonpack.dev/docs/expo-devtools/navigation),
[In-app browsers](https://axonpack.dev/docs/expo-devtools/in-app-browsers),
[Hooks and the `devtools` object](https://axonpack.dev/docs/expo-devtools/reference/hooks).
