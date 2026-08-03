import { networkLogStore } from './networkLogStore';
import type { NetworkLogEntry } from './networkLogStore';

const MESSAGE_MARKER = '__bruinDevtoolsNetwork';

type WebViewNetworkPayload = Partial<NetworkLogEntry> & Pick<NetworkLogEntry, 'id' | 'status'>;

type WebViewMessage =
  | { [MESSAGE_MARKER]: true; type: 'network'; source: string; payload: WebViewNetworkPayload }
  | { [MESSAGE_MARKER]: true; type: 'navigation'; source: string };

type WebViewMessageEventLike = {
  nativeEvent: {
    data: string;
  };
};

/**
 * A page rendered inside a <WebView> runs in its own JS engine (WKWebView/Android WebView),
 * entirely separate from the React Native JS context — patchFetch/patchXHR can't see it.
 * This script is meant to be passed to a WebView's `injectedJavaScript` prop: it patches
 * fetch/XMLHttpRequest inside the page itself, then relays each request back to React Native
 * via `window.ReactNativeWebView.postMessage`, tagged with `webviewName`.
 */
export function getWebViewInjectedScript(webviewName: string): string {
  // Checked at generation time, not injection time — if devtools was never enabled (no `init()`
  // call), don't even patch fetch/XHR inside the page, rather than patching them and just
  // dropping the messages. Avoids any behavior change to the host page when devtools is off.
  if (!networkLogStore.isEnabled()) {
    return 'true;';
  }

  const nameLiteral = JSON.stringify(webviewName);
  const markerLiteral = JSON.stringify(MESSAGE_MARKER);

  return `(function () {
    var WEBVIEW_NAME = ${nameLiteral};

    if (window.__bruinDevtoolsWebViewPatched) return;
    window.__bruinDevtoolsWebViewPatched = true;

    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        ${markerLiteral}: true,
        type: 'navigation',
        source: WEBVIEW_NAME
      }));
    } catch (e) {}

    var counter = 0;

    function nextId() {
      counter += 1;
      return WEBVIEW_NAME + '-' + Date.now() + '-' + counter;
    }

    function previewBody(body) {
      if (body === null || body === undefined) return undefined;
      if (typeof body === 'string') return body;
      if (typeof FormData !== 'undefined' && body instanceof FormData) return '[FormData]';
      return '[binary body]';
    }

    function resolveUrl(url) {
      try {
        return new URL(url, window.location.href).href;
      } catch (e) {
        return String(url);
      }
    }

    function normalizeHeaders(headers) {
      var result = {};
      if (!headers) return result;
      if (typeof Headers !== 'undefined' && headers instanceof Headers) {
        headers.forEach(function (value, key) { result[key] = value; });
        return result;
      }
      if (Array.isArray(headers)) {
        headers.forEach(function (pair) { result[pair[0]] = pair[1]; });
        return result;
      }
      for (var key in headers) {
        if (Object.prototype.hasOwnProperty.call(headers, key)) result[key] = headers[key];
      }
      return result;
    }

    function headersFromResponse(headers) {
      var result = {};
      headers.forEach(function (value, key) { result[key] = value; });
      return result;
    }

    function extractMimeType(headers) {
      var contentType = headers['content-type'];
      return contentType ? contentType.split(';')[0].trim().toLowerCase() : undefined;
    }

    function extractSize(headers, body) {
      var contentLength = Number(headers['content-length']);
      if (headers['content-length'] && !isNaN(contentLength)) return contentLength;
      return body ? body.length : undefined;
    }

    function post(payload) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          ${markerLiteral}: true,
          type: 'network',
          source: WEBVIEW_NAME,
          payload: payload
        }));
      } catch (e) {}
    }

    var originalFetch = window.fetch;
    if (originalFetch) {
      window.fetch = function (input, init) {
        var id = nextId();
        var startedAt = Date.now();
        var method = (init && init.method) || (input && input.method) || 'GET';
        var rawUrl = typeof input === 'string' ? input : (input && input.url) || String(input);
        var url = resolveUrl(rawUrl);
        var requestHeaders = normalizeHeaders((init && init.headers) || (input && input.headers));

        post({ id: id, method: String(method).toUpperCase(), url: url, status: 'pending', requestBody: previewBody(init && init.body), requestHeaders: requestHeaders, startedAt: startedAt });

        return originalFetch(input, init).then(function (response) {
          var responseHeaders = headersFromResponse(response.headers);
          response.clone().text().then(function (text) {
            post({ id: id, status: 'success', statusCode: response.status, statusText: response.statusText, responseBody: text, responseHeaders: responseHeaders, mimeType: extractMimeType(responseHeaders), size: extractSize(responseHeaders, text), duration: Date.now() - startedAt });
          }).catch(function () {
            post({ id: id, status: 'success', statusCode: response.status, statusText: response.statusText, responseHeaders: responseHeaders, mimeType: extractMimeType(responseHeaders), duration: Date.now() - startedAt });
          });
          return response;
        }).catch(function (error) {
          post({ id: id, status: 'error', error: error && error.message ? error.message : String(error), duration: Date.now() - startedAt });
          throw error;
        });
      };
    }

    var OriginalXHR = window.XMLHttpRequest;
    if (OriginalXHR) {
      var originalOpen = OriginalXHR.prototype.open;
      var originalSend = OriginalXHR.prototype.send;
      var originalSetRequestHeader = OriginalXHR.prototype.setRequestHeader;

      OriginalXHR.prototype.open = function (method, url) {
        this.__bruinId = nextId();
        this.__bruinMethod = method;
        this.__bruinUrl = resolveUrl(url);
        this.__bruinHeaders = {};
        return originalOpen.apply(this, arguments);
      };

      OriginalXHR.prototype.setRequestHeader = function (name, value) {
        if (this.__bruinHeaders) this.__bruinHeaders[name] = value;
        return originalSetRequestHeader.apply(this, arguments);
      };

      OriginalXHR.prototype.send = function (body) {
        var xhr = this;
        var id = xhr.__bruinId || nextId();
        var startedAt = Date.now();

        post({ id: id, method: String(xhr.__bruinMethod || 'GET').toUpperCase(), url: xhr.__bruinUrl || '', status: 'pending', requestBody: previewBody(body), requestHeaders: xhr.__bruinHeaders, startedAt: startedAt });

        xhr.addEventListener('readystatechange', function () {
          if (xhr.readyState !== OriginalXHR.DONE) return;
          var isNetworkFailure = xhr.status === 0;
          var responseBody = typeof xhr.responseText === 'string' ? xhr.responseText : undefined;
          var responseHeaders = {};
          try {
            var raw = xhr.getAllResponseHeaders() || '';
            raw.trim().split(/[\\r\\n]+/).forEach(function (line) {
              var idx = line.indexOf(':');
              if (idx > 0) {
                responseHeaders[line.substring(0, idx).trim().toLowerCase()] = line.substring(idx + 1).trim();
              }
            });
          } catch (e) {}

          post({
            id: id,
            status: isNetworkFailure ? 'error' : 'success',
            statusCode: xhr.status,
            statusText: xhr.statusText,
            responseBody: responseBody,
            responseHeaders: responseHeaders,
            mimeType: extractMimeType(responseHeaders),
            size: extractSize(responseHeaders, responseBody),
            error: isNetworkFailure ? 'Network request failed' : undefined,
            duration: Date.now() - startedAt
          });
        });

        return originalSend.apply(this, arguments);
      };
    }
  })();
  true;`;
}

/**
 * Pass to a WebView's `onMessage` prop (or call from within your own handler — it returns
 * `true` when it consumed a devtools message, `false` for anything else, so it composes with
 * app-specific onMessage logic instead of requiring exclusive ownership of the prop).
 *
 * When `allowedSources` is provided, messages from any other source name are silently dropped.
 */
export function handleWebViewNetworkMessage(
  event: WebViewMessageEventLike,
  allowedSources?: readonly string[]
): boolean {
  // Belt-and-suspenders: the injected script itself already becomes a no-op when disabled, but
  // this guards against a page that already ran the real script before devtools was disabled.
  if (!networkLogStore.isEnabled()) return false;

  let parsed: unknown;
  try {
    parsed = JSON.parse(event.nativeEvent.data);
  } catch {
    return false;
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as Record<string, unknown>)[MESSAGE_MARKER] !== true
  ) {
    return false;
  }

  const message = parsed as WebViewMessage;

  if (allowedSources && !allowedSources.includes(message.source)) {
    return false;
  }

  if (message.type === 'navigation') {
    networkLogStore.notifyNavigation();
    return true;
  }

  const { source, payload } = message;

  if (payload.status === 'pending') {
    networkLogStore.add({ ...payload, source } as NetworkLogEntry);
  } else {
    networkLogStore.update(payload.id, { ...payload, source });
  }

  return true;
}
