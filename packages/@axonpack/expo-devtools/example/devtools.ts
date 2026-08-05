import { createDevtoolsClient } from '@axonpack/expo-devtools';

export const devtools = createDevtoolsClient({
  network: {
    includeFetch: true,
    includeXmlHttpRequest: true,
    webviewSources: ['example-webview', 'test2'],
  },
});
