import * as DevTools from '@bruin/devtools';
import { registerRootComponent } from 'expo';

import App from './App';

DevTools.config({
  network: {
    includeFetch: true,
    includeXmlHttpRequest: true,
    customNetworkEvent: '', // not decided yet
  },
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
