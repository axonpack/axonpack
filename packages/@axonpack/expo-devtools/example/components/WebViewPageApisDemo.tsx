import { WebView } from 'react-native-webview';

import { devtools } from '../devtools';

/**
 * A page that exercises what only a page can do: its own `EventSource`, its own `WebSocket`, its own
 * cookies, and requests the engine measures for itself.
 *
 * It loads a real origin rather than inline HTML, and that is the point — a page built from an HTML
 * string has no origin, so `document.cookie` does not stick and every fetch is cross-origin. Loading
 * postman-echo means the buttons below are same-origin calls, which is what a real page's traffic looks
 * like. The body it renders is JSON; the harness replaces it with the controls.
 */
const PAGE_HARNESS = `
  (function () {
    var actions = [
      ['Fetch (same origin)', function () { fetch('/get?from=page'); }],
      ['Fetch a chunked body', function () { fetch('/stream/3'); }],
      ['Set a cookie, then fetch', function () {
        document.cookie = 'demo_page=1; path=/';
        fetch('/cookies');
      }],
      ['Open an event stream', function () {
        if (window.__demoStream) { window.__demoStream.close(); }
        var stream = new EventSource('/server-events/10');
        window.__demoStream = stream;
        stream.addEventListener('notification', function () {});
        stream.onmessage = function () {};
      }],
      ['Close the event stream', function () {
        if (window.__demoStream) { window.__demoStream.close(); window.__demoStream = null; }
      }],
      ['Open a socket, send a frame', function () {
        var socket = new WebSocket('wss://ws.postman-echo.com/raw');
        socket.onopen = function () { socket.send('hello from the page'); };
        window.__demoSocket = socket;
      }],
    ];

    document.body.innerHTML =
      '<h3 style="font:600 17px -apple-system,system-ui;margin:16px 12px 4px">Page APIs</h3>' +
      '<p style="font:13px -apple-system,system-ui;color:#555;margin:0 12px 12px">' +
      'Each button is traffic only the page can make. Open the devtools Network tab to see it.</p>' +
      '<div id="demo-actions" style="display:flex;flex-direction:column;gap:8px;padding:0 12px"></div>' +
      '<pre id="demo-log" style="font:11px ui-monospace;color:#666;padding:8px 12px;white-space:pre-wrap"></pre>';

    var host = document.getElementById('demo-actions');
    var log = document.getElementById('demo-log');

    function note(line) {
      log.textContent = line + '\\n' + log.textContent;
    }

    actions.forEach(function (action) {
      var button = document.createElement('button');
      button.textContent = action[0];
      button.setAttribute(
        'style',
        'font:600 14px -apple-system,system-ui;color:#0a7ea4;background:#e6f4fe;' +
          'border:1px solid #0a7ea4;border-radius:8px;padding:10px 12px;text-align:left'
      );
      button.onclick = function () {
        note(action[0]);
        action[1]();
      };
      host.appendChild(button);
    });
  })();
  true;
`;

export function WebViewPageApisDemo() {
  return (
    <WebView
      ref={devtools.getWebViewRef('page-apis')}
      injectedJavaScript={PAGE_HARNESS}
      userAgent={devtools.getWebViewUserAgent()}
      source={{ uri: 'https://postman-echo.com/get' }}
      injectedJavaScriptBeforeContentLoaded={devtools.getWebViewInjectedJavaScriptBeforeContentLoaded(
        'page-apis'
      )}
      onShouldStartLoadWithRequest={devtools.shouldAllowWebViewRequest}
      onMessage={(event) => {
        devtools.handleWebViewMessage(event);
      }}
    />
  );
}
