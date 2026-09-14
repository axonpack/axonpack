import { useDevtoolsWebView } from '@axonpack/expo-devtools';
import { WebView } from 'react-native-webview';

const DEMO_PAGE_LOGS = `
  console.log('hello from the WebView page', { href: location.href, title: document.title });
  console.warn('a warning raised inside the WebView');
  console.error(new Error('an error thrown inside the WebView'));
  true;
`;

export function WebViewDemo() {
  const devtoolsWebView = useDevtoolsWebView('test2');

  return (
    <WebView
      {...devtoolsWebView}
      injectedJavaScript={DEMO_PAGE_LOGS}
      source={{ uri: 'https://www.google.com' }}
    />
  );
}
