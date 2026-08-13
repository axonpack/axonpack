import { createDevtoolsClient } from '@axonpack/expo-devtools';

export const devtools = createDevtoolsClient({
  defaultTheme: 'dark',
  themes: {
    midnight: { base: 'dark', colors: { accent: '#a78bfa' } },
  },
  webviewSources: ['example-webview', 'test2'],
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
});
