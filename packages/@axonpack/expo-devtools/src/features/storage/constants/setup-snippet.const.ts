/** What the empty tab shows: the three common stores, registered. */
export const STORAGE_SETUP_SNIPPET = `import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';
import * as SecureStore from 'expo-secure-store';
import {
  DevtoolsProvider,
  asyncStorageAdapter,
  mmkvAdapter,
  secureStoreAdapter,
} from '@axonpack/expo-devtools';

const mmkv = new MMKV();

<DevtoolsProvider
  config={{
    storage: {
      adapters: [
        asyncStorageAdapter({ driver: AsyncStorage }),
        mmkvAdapter({ driver: mmkv }),
        // SecureStore can't list its own keys, so you name them.
        secureStoreAdapter({ driver: SecureStore, keys: ['session'] }),
      ],
    },
  }}>
  <App />
</DevtoolsProvider>;`;
