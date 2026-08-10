import { createDevtoolsClient } from '@axonpack/expo-devtools';

export const devtools = createDevtoolsClient({
  name: 'Devtools Example',
  icon: require('./assets/icon.png'),
  webviewSources: ['example-webview', 'test2'],
  network: {
    disabledByDefault: false,
    includeFetch: true,
    includeXmlHttpRequest: true,
  },
  console: {
    disabledByDefault: false,
    // Names the `>` prompt can reach directly. Globals and `$modules()`/`$m('path')` work without
    // this — it's here to demo the shape a real app would use for its store or query client.
    context: {
      appInfo: { name: 'devtools-example', platform: 'expo', tabs: ['requests', 'console'] },
      double: (value: number) => value * 2,
    },
  },
});
