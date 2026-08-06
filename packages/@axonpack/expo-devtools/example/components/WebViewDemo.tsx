import { WebView } from 'react-native-webview';

import { devtools } from '../devtools';

export function WebViewDemo() {
  return (
    <WebView
      ref={devtools.getWebViewRef('test2')}
      userAgent={devtools.getWebViewUserAgent()}
      source={{ uri: 'https://www.google.com' }}
      injectedJavaScriptBeforeContentLoaded={devtools.getWebViewInjectedJavaScriptBeforeContentLoaded(
        'test2'
      )}
      onShouldStartLoadWithRequest={devtools.shouldAllowWebViewRequest}
      onMessage={(event) => {
        devtools.handleWebViewMessage(event);
      }}
    />
  );
}
