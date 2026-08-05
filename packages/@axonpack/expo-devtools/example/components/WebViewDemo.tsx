import { WebView } from 'react-native-webview';

import { devtools } from '../devtools';

export function WebViewDemo() {
  return (
    <WebView
      source={{ uri: 'https://www.google.com' }}
      injectedJavaScript={devtools.getWebViewInjectedScript('test2')}
      onMessage={(event) => {
        devtools.handleWebViewMessage(event);
      }}
    />
  );
}
