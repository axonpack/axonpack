import { networkLogStore } from './networkLogStore';
import type { NetworkLogEntry } from './networkLogStore';

const MESSAGE_MARKER = '__bruinDevtoolsNetwork';

type WebViewNetworkMessage = {
  [MESSAGE_MARKER]: true;
  source: string;
  payload: Partial<NetworkLogEntry> & Pick<NetworkLogEntry, 'id' | 'status'>;
};

type WebViewMessageEventLike = {
  nativeEvent: {
    data: string;
  };
};

export function getWebViewInjectedScript(webviewName: string): string {
  const nameLiteral = JSON.stringify(webviewName);
  const markerLiteral = JSON.stringify(MESSAGE_MARKER);

  return `(function () {
    if (window.__bruinDevtoolsWebViewPatched) return;
    window.__bruinDevtoolsWebViewPatched = true;

    var WEBVIEW_NAME = ${nameLiteral};
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

    function post(payload) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          ${markerLiteral}: true,
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

        post({ id: id, method: String(method).toUpperCase(), url: url, status: 'pending', requestBody: previewBody(init && init.body), startedAt: startedAt });

        return originalFetch(input, init).then(function (response) {
          response.clone().text().then(function (text) {
            post({ id: id, status: 'success', statusCode: response.status, responseBody: text, duration: Date.now() - startedAt });
          }).catch(function () {
            post({ id: id, status: 'success', statusCode: response.status, duration: Date.now() - startedAt });
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

      OriginalXHR.prototype.open = function (method, url) {
        this.__bruinId = nextId();
        this.__bruinMethod = method;
        this.__bruinUrl = resolveUrl(url);
        return originalOpen.apply(this, arguments);
      };

      OriginalXHR.prototype.send = function (body) {
        var xhr = this;
        var id = xhr.__bruinId || nextId();
        var startedAt = Date.now();

        post({ id: id, method: String(xhr.__bruinMethod || 'GET').toUpperCase(), url: xhr.__bruinUrl || '', status: 'pending', requestBody: previewBody(body), startedAt: startedAt });

        xhr.addEventListener('readystatechange', function () {
          if (xhr.readyState !== OriginalXHR.DONE) return;
          var isNetworkFailure = xhr.status === 0;
          post({
            id: id,
            status: isNetworkFailure ? 'error' : 'success',
            statusCode: xhr.status,
            responseBody: typeof xhr.responseText === 'string' ? xhr.responseText : undefined,
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

  const { source, payload } = parsed as WebViewNetworkMessage;

  if (allowedSources && !allowedSources.includes(source)) {
    return false;
  }

  if (payload.status === 'pending') {
    networkLogStore.add({ ...payload, source } as NetworkLogEntry);
  } else {
    networkLogStore.update(payload.id, { ...payload, source });
  }

  return true;
}
