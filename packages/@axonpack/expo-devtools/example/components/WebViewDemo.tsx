import { WebView } from 'react-native-webview';

import { devtools } from '../devtools';

// Runs after the page loads, so the Console tab has real in-page output to show. Separate from the
// devtools' own `injectedJavaScriptBeforeContentLoaded` — that one installs the capture, this one
// exercises it.
const DEMO_PAGE_LOGS = `
  console.log('hello from the WebView page', { href: location.href, title: document.title });
  console.warn('a warning raised inside the WebView');
  console.error(new Error('an error thrown inside the WebView'));
  true;
`;

export function WebViewDemo() {
  return (
    <WebView
      ref={devtools.getWebViewRef('test2')}
      injectedJavaScript={DEMO_PAGE_LOGS}
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
