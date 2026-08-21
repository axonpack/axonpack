import { recordStreamEvents } from './record-stream-events.service';
import {
  buildConditionsScript,
  CONDITIONS_GLOBAL,
  pushConditionsToWebView,
} from './webview-conditions.service';
import { networkLogStore } from '../stores/network-log.store';
import type { NetworkLogEntry } from '../stores/network-log.store';

const MESSAGE_MARKER = '__bruinDevtoolsNetwork';

type WebViewNetworkPayload = Partial<NetworkLogEntry> & Pick<NetworkLogEntry, 'id' | 'status'>;

/**
 * A socket the page opened, relayed one event at a time. The page's own engine is the only place
 * these exist: React Native's `WebSocketModule` never sees them, so the native patch is blind here
 * in exactly the way it is for the page's fetch and XHR.
 */
type WebViewSocketPayload = {
  /** The page's own counter for the socket, which is all that ties its events together. */
  socketId: number;
  event: 'connect' | 'open' | 'message' | 'close' | 'error';
  url?: string;
  protocols?: string[];
  direction?: 'sent' | 'received';
  data?: string;
  messageType?: 'text' | 'binary';
  code?: number;
  reason?: string;
  error?: string;
  duration?: number;
};

/** One event of a stream the page opened, relayed as it happens. */
type WebViewStreamPayload = {
  /** Minted by the page, and the only thing tying a stream's events together. */
  id: string;
  event: 'connect' | 'open' | 'message' | 'error' | 'close';
  url?: string;
  startedAt?: number;
  type?: string;
  data?: string;
  lastEventId?: string;
  duration?: number;
};

type WebViewMessage =
  | { [MESSAGE_MARKER]: true; type: 'network'; source: string; payload: WebViewNetworkPayload }
  | { [MESSAGE_MARKER]: true; type: 'eventsource'; source: string; payload: WebViewStreamPayload }
  | { [MESSAGE_MARKER]: true; type: 'websocket'; source: string; payload: WebViewSocketPayload }
  | { [MESSAGE_MARKER]: true; type: 'navigation'; source: string };

/**
 * Off when the consumer turned sockets off, since a page's socket is a socket: the same switch that
 * silences React Native's own has to silence these, or the option only half works.
 */
let captureSockets = true;

export function setWebViewSocketCapture(enabled: boolean) {
  captureSockets = enabled;
}

type WebViewMessageEventLike = {
  nativeEvent: {
    data: string;
  };
};

export function getWebViewInjectedJavaScriptBeforeContentLoaded(webviewName: string): string {
  if (!networkLogStore.isEnabled()) {
    return 'true;';
  }

  const nameLiteral = JSON.stringify(webviewName);
  const markerLiteral = JSON.stringify(MESSAGE_MARKER);

  return `(function () {
    var WEBVIEW_NAME = ${nameLiteral};

    // Re-seeded on every navigation, and pushed over injectJavaScript whenever the store changes
    // — see webview-conditions.service.ts.
    ${buildConditionsScript()}

    if (window.__bruinDevtoolsWebViewPatched) return;
    window.__bruinDevtoolsWebViewPatched = true;

    function conditions() {
      return window.${CONDITIONS_GLOBAL} || { offline: false, throttle: null, userAgent: null };
    }

    function sleep(ms) {
      return new Promise(function (resolve) { setTimeout(resolve, ms > 0 ? ms : 0); });
    }

    // Bytes to bits, then bits over kbps lands directly in milliseconds.
    function throttleRemainingMs(size, startedAt) {
      var throttle = conditions().throttle;
      if (!throttle) return 0;
      var transfer = size && throttle.downloadKbps > 0 ? (size * 8) / throttle.downloadKbps : 0;
      return Math.max(0, Math.round(throttle.latencyMs + transfer) - (Date.now() - startedAt));
    }

    // Only affects in-page JS that sniffs navigator.userAgent — the real HTTP header comes from
    // react-native-webview's own userAgent prop, since User-Agent is a forbidden fetch header.
    (function () {
      var override = conditions().userAgent;
      if (!override) return;
      try {
        Object.defineProperty(window.navigator, 'userAgent', {
          configurable: true,
          get: function () { return override; }
        });
      } catch (e) {}
    })();

    // Injected before content loads, the RN bridge may not exist yet (notably on Android), so
    // messages are queued rather than dropped. Without this, everything captured during page
    // startup — the whole reason for injecting early — would be lost.
    var outbox = [];
    var flushTimer = null;

    function bridgeReady() {
      return !!(window.ReactNativeWebView && window.ReactNativeWebView.postMessage);
    }

    function flushOutbox() {
      while (outbox.length) {
        try { window.ReactNativeWebView.postMessage(outbox.shift()); } catch (e) {}
      }
    }

    function send(message) {
      var json;
      try { json = JSON.stringify(message); } catch (e) { return; }
      if (bridgeReady()) {
        try { window.ReactNativeWebView.postMessage(json); } catch (e) {}
        return;
      }
      outbox.push(json);
      if (flushTimer) return;
      flushTimer = setInterval(function () {
        if (!bridgeReady()) return;
        clearInterval(flushTimer);
        flushTimer = null;
        flushOutbox();
      }, 25);
    }

    function envelope(type, payload) {
      var message = {};
      message[${markerLiteral}] = true;
      message.type = type;
      message.source = WEBVIEW_NAME;
      if (payload) message.payload = payload;
      return message;
    }

    // Doubles as the cue for React Native to push fresh conditions back — the snapshot baked into
    // this script is whatever the consumer last rendered with, which may be stale by now.
    send(envelope('navigation'));

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
      send(envelope('network', payload));
    }

    /**
     * What the page's own document can see. Not the same as what the request sent: the engine sets the
     * Cookie header itself and JavaScript is not allowed to read it, and an HttpOnly cookie is
     * invisible here by design. So this is reported as the page's jar and labelled as that.
     */
    function pageCookies() {
      try {
        return document.cookie || undefined;
      } catch (e) {
        return undefined;
      }
    }

    /**
     * The phases of a request as the *engine* measured them. A page has the real
     * PerformanceResourceTiming — the one React Native only stubs — so a WebView request can report
     * DNS, TCP and TLS for real, along with the encoded and decoded sizes.
     *
     * Zero means "not available" in that API rather than "took no time": every detailed field is zeroed
     * for a cross-origin response whose server did not send Timing-Allow-Origin. So a zero is dropped
     * rather than reported, the same way a phase the platform never measured is dropped everywhere else.
     */
    function positive(value) {
      return typeof value === 'number' && value > 0 ? value : undefined;
    }

    function span(from, to) {
      if (!from || !to || to < from) return undefined;
      return to - from;
    }

    function relayResourceTiming(id, url) {
      if (!window.performance || !performance.getEntriesByName) return;
      // The entry is recorded when the response completes, which can be after the promise resolves —
      // so it is looked for on the next turn rather than now.
      setTimeout(function () {
        var entries;
        try {
          entries = performance.getEntriesByName(url, 'resource');
        } catch (e) {
          return;
        }
        if (!entries || !entries.length) return;
        var timing = entries[entries.length - 1];

        var workStart = timing.domainLookupStart || timing.connectStart || timing.requestStart;
        var phases = {
          queuedMs: span(timing.fetchStart, workStart),
          dnsMs: span(timing.domainLookupStart, timing.domainLookupEnd),
          tcpMs: span(timing.connectStart, timing.secureConnectionStart || timing.connectEnd),
          tlsMs: span(timing.secureConnectionStart, timing.connectEnd),
          // No requestEnd exists in this API, so there is no sending phase to report — the wait is
          // measured from the request starting, and says so by containing it.
          waitMs: span(timing.requestStart, timing.responseStart),
          downloadMs: span(timing.responseStart, timing.responseEnd),
          protocol: timing.nextHopProtocol || undefined,
          measuredBy: 'webview'
        };

        var wire = positive(timing.encodedBodySize);
        var decoded = positive(timing.decodedBodySize);

        post({
          id: id,
          phases: phases,
          transfer: wire === undefined && decoded === undefined
            ? undefined
            : { wireBytes: wire, decodedBytes: decoded }
        });
      }, 0);
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

        // Reported from the page rather than stamped natively: an in-flight request keeps the
        // conditions the page had, even if a new set is pushed over before it finishes.
        post({ id: id, method: String(method).toUpperCase(), url: url, status: 'pending', requestBody: previewBody(init && init.body), requestHeaders: requestHeaders, pageCookies: pageCookies(), startedAt: startedAt, conditions: conditions() });

        if (conditions().offline) {
          post({ id: id, status: 'error', error: 'Network request failed (offline — simulated by devtools)', duration: Date.now() - startedAt });
          return Promise.reject(new TypeError('Network request failed'));
        }

        return originalFetch(input, init).then(function (response) {
          var responseHeaders = headersFromResponse(response.headers);
          // Body has to be read before the throttle wait so the delay can account for its size,
          // and the response is only handed back once that wait is over.
          return response.clone().text().then(function (text) { return text; }, function () { return undefined; })
            .then(function (text) {
              var size = extractSize(responseHeaders, text);
              return sleep(throttleRemainingMs(size, startedAt)).then(function () {
                post({ id: id, status: 'success', statusCode: response.status, statusText: response.statusText, responseBody: text, responseHeaders: responseHeaders, mimeType: extractMimeType(responseHeaders), size: size, duration: Date.now() - startedAt });
                relayResourceTiming(id, url);
                return response;
              });
            });
        }).catch(function (error) {
          post({ id: id, status: 'error', error: error && error.message ? error.message : String(error), duration: Date.now() - startedAt });
          throw error;
        });
      };
    }

    // Analytics libraries lean on sendBeacon, so it'd otherwise be a steady stream of traffic
    // that ignores Offline entirely. Returning false is the API's own "couldn't queue it" signal.
    if (navigator.sendBeacon) {
      var originalSendBeacon = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = function (url, data) {
        var id = nextId();
        var startedAt = Date.now();
        var resolved = resolveUrl(url);
        post({ id: id, method: 'POST', url: resolved, status: 'pending', requestBody: previewBody(data), startedAt: startedAt, conditions: conditions() });

        if (conditions().offline) {
          post({ id: id, status: 'error', error: 'Network request failed (offline — simulated by devtools)', duration: 0 });
          return false;
        }

        var queued = originalSendBeacon(url, data);
        post({ id: id, status: queued ? 'success' : 'error', error: queued ? undefined : 'sendBeacon refused to queue', duration: Date.now() - startedAt });
        return queued;
      };
    }

    var OriginalXHR = window.XMLHttpRequest;
    if (OriginalXHR) {
      var originalOpen = OriginalXHR.prototype.open;
      var originalSend = OriginalXHR.prototype.send;
      var originalSetRequestHeader = OriginalXHR.prototype.setRequestHeader;
      var originalAddEventListener = OriginalXHR.prototype.addEventListener;
      var originalRemoveEventListener = OriginalXHR.prototype.removeEventListener;

      // Only the terminal events get held back. 'progress' is deliberately left alone: delaying
      // each tick by the full remaining time would bunch them all at the end anyway.
      var DEFERRED_EVENTS = ['readystatechange', 'load', 'loadend', 'error', 'timeout'];
      var wrappedListeners = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

      function estimateSize(xhr) {
        try {
          var length = Number(xhr.getResponseHeader('content-length'));
          if (length > 0 && !isNaN(length)) return length;
        } catch (e) {}
        try {
          return typeof xhr.responseText === 'string' ? xhr.responseText.length : 0;
        } catch (e) {
          return 0;
        }
      }

      function describeNonText(xhr) {
        try {
          var response = xhr.response;
          if (response == null) return undefined;
          if (typeof response === 'string') return response;
          if (typeof Blob !== 'undefined' && response instanceof Blob) {
            return '[Blob ' + response.size + ' bytes' + (response.type ? ', ' + response.type : '') + ']';
          }
          if (typeof ArrayBuffer !== 'undefined' && response instanceof ArrayBuffer) {
            return '[ArrayBuffer ' + response.byteLength + ' bytes]';
          }
          if (typeof response === 'object') return JSON.stringify(response);
          return String(response);
        } catch (e) {
          return undefined;
        }
      }

      // responseText is a throwing getter whenever responseType is not '' or 'text' — reading it
      // unguarded raises InvalidStateError inside the page, which would break the page's own XHR.
      function readResponseBody(xhr) {
        var responseType;
        try {
          responseType = xhr.responseType;
        } catch (e) {
          return undefined;
        }
        if (responseType && responseType !== 'text') return describeNonText(xhr);
        try {
          return typeof xhr.responseText === 'string' ? xhr.responseText : undefined;
        } catch (e) {
          return undefined;
        }
      }

      // Resolved once per request and cached, so every listener on the same dispatch computes the
      // same target and fires in registration order rather than drifting apart.
      function deliveryDelay(xhr) {
        var state = xhr.__bruinThrottle;
        if (!state || xhr.readyState !== OriginalXHR.DONE) return 0;
        if (state.deliverAt === undefined) {
          var throttle = state.profile;
          var transfer =
            throttle.downloadKbps > 0 ? (estimateSize(xhr) * 8) / throttle.downloadKbps : 0;
          state.deliverAt = state.startedAt + Math.round(throttle.latencyMs + transfer);
        }
        return Math.max(0, state.deliverAt - Date.now());
      }

      // A browser engine has no setReadyState hook to defer the whole DONE transition the way
      // React Native's own XHR does, so the page's listeners have to be wrapped individually.
      function deferListener(listener) {
        return function (event) {
          var xhr = event.currentTarget || event.target || this;
          var invoke = function () {
            if (typeof listener === 'function') listener.call(xhr, event);
            else if (listener && typeof listener.handleEvent === 'function') {
              listener.handleEvent.call(listener, event);
            }
          };
          var wait = deliveryDelay(xhr);
          if (wait > 0) setTimeout(invoke, wait);
          else invoke();
        };
      }

      OriginalXHR.prototype.addEventListener = function (type, listener, options) {
        if (!listener || DEFERRED_EVENTS.indexOf(type) === -1) {
          return originalAddEventListener.call(this, type, listener, options);
        }
        var wrapped = wrappedListeners ? wrappedListeners.get(listener) : null;
        if (!wrapped) {
          wrapped = deferListener(listener);
          if (wrappedListeners) wrappedListeners.set(listener, wrapped);
        }
        return originalAddEventListener.call(this, type, wrapped, options);
      };

      OriginalXHR.prototype.removeEventListener = function (type, listener, options) {
        var wrapped = listener && wrappedListeners ? wrappedListeners.get(listener) : null;
        return originalRemoveEventListener.call(this, type, wrapped || listener, options);
      };

      // Unlike React Native's XHR, a browser's on* setters register internally rather than going
      // through the public addEventListener, so patching that alone would miss xhr.onload = fn.
      DEFERRED_EVENTS.forEach(function (type) {
        var name = 'on' + type;
        var owner = OriginalXHR.prototype;
        var descriptor = null;
        while (owner && !descriptor) {
          descriptor = Object.getOwnPropertyDescriptor(owner, name);
          if (!descriptor) owner = Object.getPrototypeOf(owner);
        }
        if (!descriptor || !descriptor.set || !descriptor.configurable) return;
        var originalSetter = descriptor.set;
        Object.defineProperty(owner, name, {
          configurable: true,
          enumerable: descriptor.enumerable,
          // Hands back what the page assigned, not our wrapper, so identity checks still hold.
          get: function () {
            return this.__bruinHandlers && name in this.__bruinHandlers
              ? this.__bruinHandlers[name]
              : descriptor.get
                ? descriptor.get.call(this)
                : null;
          },
          set: function (listener) {
            if (!this.__bruinHandlers) this.__bruinHandlers = {};
            this.__bruinHandlers[name] = listener;
            originalSetter.call(this, typeof listener === 'function' ? deferListener(listener) : listener);
          }
        });
      });

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
        var activeConditions = conditions();

        if (activeConditions.throttle) {
          xhr.__bruinThrottle = { profile: activeConditions.throttle, startedAt: startedAt };
        }

        post({ id: id, method: String(xhr.__bruinMethod || 'GET').toUpperCase(), url: xhr.__bruinUrl || '', status: 'pending', requestBody: previewBody(body), requestHeaders: xhr.__bruinHeaders, pageCookies: pageCookies(), startedAt: startedAt, conditions: activeConditions });

        xhr.addEventListener('readystatechange', function () {
          if (xhr.readyState !== OriginalXHR.DONE) return;
          var isNetworkFailure = xhr.status === 0;
          var responseBody = readResponseBody(xhr);
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
          relayResourceTiming(id, xhr.__bruinUrl || '');
        });

        if (activeConditions.offline) {
          setTimeout(function () {
            post({ id: id, status: 'error', error: 'Network request failed (offline — simulated by devtools)', duration: Date.now() - startedAt });
            try {
              xhr.dispatchEvent(new Event('error'));
              xhr.dispatchEvent(new Event('loadend'));
            } catch (e) {}
          }, 0);
          return;
        }

        // Sent immediately — latency and bandwidth are both applied when the response is handed
        // to the page's listeners, so delaying the send here too would double-count the latency.
        return originalSend.apply(this, arguments);
      };
    }

    // Sockets the page opens. Nothing above can see these: a page runs in its own engine, and its own
    // WebSocket never reaches the native module the app's sockets go through. Inside the closure on
    // purpose — it relays through the same queued bridge and URL resolver as everything else here.
    ${captureSockets ? buildSocketPatch() : ''}

    // Streams the page opens. A page has a real EventSource, which React Native does not ship at all —
    // so this is the one transport whose page version needs no interpretation of a wire format.
    ${buildEventSourcePatch()}
  })();
  true;`;
}

/**
 * The page's `EventSource`, wrapped the same way its `WebSocket` is and for the same reasons: the
 * wrapper hands back a real one and borrows its prototype, so every `instanceof` the page might do
 * still passes.
 *
 * A stream from a page is a row of the same shape as one from the app — an HTTP request with events
 * beside it — even though nothing here parses `text/event-stream`: the engine has already done that,
 * and re-deriving events from the raw body would only be able to disagree with it.
 */
function buildEventSourcePatch(): string {
  return `(function () {
    var OriginalEventSource = window.EventSource;
    if (!OriginalEventSource) return;

    var streamCounter = 0;

    function PatchedEventSource(url, config) {
      var stream =
        config === undefined ? new OriginalEventSource(url) : new OriginalEventSource(url, config);

      streamCounter += 1;
      var id = WEBVIEW_NAME + '-es-' + streamCounter;
      var startedAt = Date.now();
      var resolved = resolveUrl(url);

      function relay(payload) {
        payload.id = id;
        send(envelope('eventsource', payload));
      }

      // An event stream is a GET that never says it finished, which is exactly how the row reads.
      relay({ event: 'connect', url: resolved, startedAt: startedAt });

      stream.addEventListener('open', function () {
        relay({ event: 'open' });
      });

      // Every named event as well as the default one. \`message\` catches what has no name; anything
      // else is only delivered to a listener asking for that name, which a wrapper cannot know in
      // advance — so the page's own \`addEventListener\` is what tells us the names to watch.
      stream.addEventListener('message', function (event) {
        relay({ event: 'message', type: 'message', data: String(event.data), lastEventId: event.lastEventId || undefined });
      });

      var originalAddEventListener = stream.addEventListener;
      var watched = { open: true, message: true, error: true };
      stream.addEventListener = function (type, listener, options) {
        if (!watched[type]) {
          watched[type] = true;
          originalAddEventListener.call(stream, type, function (event) {
            relay({ event: 'message', type: type, data: String(event.data), lastEventId: event.lastEventId || undefined });
          });
        }
        return originalAddEventListener.call(stream, type, listener, options);
      };

      stream.addEventListener('error', function () {
        // The spec gives an error event no detail at all, and the stream may still reconnect — so this
        // says one happened without calling the stream finished.
        relay({ event: 'error' });
      });

      var originalClose = stream.close;
      stream.close = function () {
        relay({ event: 'close', duration: Date.now() - startedAt });
        return originalClose.apply(stream, arguments);
      };

      return stream;
    }

    PatchedEventSource.prototype = OriginalEventSource.prototype;
    PatchedEventSource.CONNECTING = OriginalEventSource.CONNECTING;
    PatchedEventSource.OPEN = OriginalEventSource.OPEN;
    PatchedEventSource.CLOSED = OriginalEventSource.CLOSED;

    try {
      window.EventSource = PatchedEventSource;
    } catch (e) {
      // A page that froze the global keeps its own stream, and this tab reports none.
    }
  })();`;
}

/**
 * The page's `WebSocket`, wrapped rather than subclassed, because the wrapper has to keep passing
 * every `instanceof` the page might do. Assigning the original prototype to the wrapper is what
 * preserves both directions of that check; the statics are copied because they are read as
 * `WebSocket.OPEN` rather than off an instance.
 *
 * Only reads. Nothing here delays, blocks or rewrites a frame — the throttle and offline switches
 * apply to requests, and a socket that stalled because the panel said so would be a lie about the
 * page's own behaviour.
 */
function buildSocketPatch(): string {
  return `(function () {
    var OriginalWebSocket = window.WebSocket;
    if (!OriginalWebSocket) return;

    var socketCounter = 0;

    function describeFrame(data) {
      if (typeof data === 'string') return { messageType: 'text', data: data };
      // A blob's bytes are only readable asynchronously, so only its shape is reported — the same
      // answer the native path gives for the same reason.
      if (typeof Blob !== 'undefined' && data instanceof Blob) {
        return { messageType: 'binary', data: '[binary ' + data.size + ' bytes]' };
      }
      if (data && typeof data.byteLength === 'number') {
        return { messageType: 'binary', data: '[binary ' + data.byteLength + ' bytes]' };
      }
      return { messageType: 'text', data: String(data) };
    }

    function PatchedWebSocket(url, protocols) {
      var socket =
        protocols === undefined
          ? new OriginalWebSocket(url)
          : new OriginalWebSocket(url, protocols);

      socketCounter += 1;
      var socketId = socketCounter;
      var startedAt = Date.now();

      function relay(event, extra) {
        var payload = extra || {};
        payload.socketId = socketId;
        payload.event = event;
        send(envelope('websocket', payload));
      }

      relay('connect', {
        url: resolveUrl(url),
        protocols:
          protocols === undefined ? undefined : [].concat(protocols).map(function (p) { return String(p); })
      });

      socket.addEventListener('open', function () { relay('open'); });

      socket.addEventListener('message', function (event) {
        var frame = describeFrame(event.data);
        relay('message', { direction: 'received', data: frame.data, messageType: frame.messageType });
      });

      socket.addEventListener('close', function (event) {
        relay('close', {
          code: event && typeof event.code === 'number' ? event.code : undefined,
          reason: event && event.reason ? String(event.reason) : undefined,
          duration: Date.now() - startedAt
        });
      });

      // A socket error carries no detail anywhere, by design of the spec — the row says one happened.
      socket.addEventListener('error', function () { relay('error', { error: 'Socket error' }); });

      var originalSend = socket.send;
      socket.send = function (data) {
        var frame = describeFrame(data);
        relay('message', { direction: 'sent', data: frame.data, messageType: frame.messageType });
        return originalSend.apply(socket, arguments);
      };

      return socket;
    }

    // Instances come from the original constructor, so sharing its prototype keeps
    // \`socket instanceof WebSocket\` true whichever of the two the page checks against.
    PatchedWebSocket.prototype = OriginalWebSocket.prototype;
    PatchedWebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
    PatchedWebSocket.OPEN = OriginalWebSocket.OPEN;
    PatchedWebSocket.CLOSING = OriginalWebSocket.CLOSING;
    PatchedWebSocket.CLOSED = OriginalWebSocket.CLOSED;

    try {
      window.WebSocket = PatchedWebSocket;
    } catch (e) {
      // A page that froze the global keeps its own socket, and this tab reports none.
    }
  })();`;
}

let socketMessageCounter = 0;

/**
 * One relayed socket event, applied to the same store the app's own sockets write to — a page's
 * socket is a row in the same list, told apart only by its source.
 *
 * The entry id is built from the page's counter rather than sent, so every event of one socket lands
 * on one row without the page having to be trusted with an id of ours.
 */
function applySocketEvent(source: string, payload: WebViewSocketPayload) {
  const id = `ws-${source}-${payload.socketId}`;

  if (payload.event === 'connect') {
    networkLogStore.addWebSocket({
      id,
      socketId: payload.socketId,
      url: payload.url ?? '',
      method: 'WS',
      source,
      protocols: payload.protocols,
      status: 'connecting',
      startedAt: Date.now(),
    });
    return;
  }

  if (payload.event === 'message') {
    socketMessageCounter += 1;
    networkLogStore.addWebSocketMessage(id, {
      id: `wvm-${socketMessageCounter}`,
      direction: payload.direction ?? 'received',
      data: payload.data ?? '',
      messageType: payload.messageType ?? 'text',
      timestamp: Date.now(),
    });
    return;
  }

  if (payload.event === 'open') {
    networkLogStore.updateWebSocket(id, { status: 'open' });
    return;
  }

  if (payload.event === 'close') {
    networkLogStore.updateWebSocket(id, {
      status: 'closed',
      closeCode: payload.code,
      closeReason: payload.reason,
      duration: payload.duration,
    });
    return;
  }

  networkLogStore.updateWebSocket(id, { status: 'error', error: payload.error ?? 'Socket error' });
}

/**
 * A stream from a page, kept in the same shape as one from the app: an HTTP entry marked as a stream,
 * with its events beside it. So the row, the Events tab and the filters all work on it unchanged.
 */
function applyStreamEvent(source: string, payload: WebViewStreamPayload) {
  if (payload.event === 'connect') {
    networkLogStore.add({
      id: payload.id,
      method: 'GET',
      url: payload.url ?? '',
      status: 'pending',
      eventStream: true,
      source,
      startedAt: payload.startedAt ?? Date.now(),
    });
    return;
  }

  if (payload.event === 'message') {
    recordStreamEvents(payload.id, [
      {
        type: payload.type ?? 'message',
        data: payload.data ?? '',
        ...(payload.lastEventId === undefined ? null : { lastEventId: payload.lastEventId }),
      },
    ]);
    return;
  }

  if (payload.event === 'close') {
    // Closing a stream is how a stream ends, the same as on the app's own side.
    networkLogStore.update(payload.id, { status: 'success', duration: payload.duration });
    return;
  }

  if (payload.event === 'error') {
    // The spec gives an error event no detail, and the engine may still reconnect — so the row says
    // one happened without claiming the stream is over.
    networkLogStore.update(payload.id, { error: 'Stream error' });
  }
}

export function handleWebViewNetworkMessage(
  event: WebViewMessageEventLike,
  allowedSources?: readonly string[]
): boolean {
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
    pushConditionsToWebView(message.source);
    networkLogStore.notifyNavigation();
    return true;
  }

  if (message.type === 'websocket') {
    applySocketEvent(message.source, message.payload);
    return true;
  }

  if (message.type === 'eventsource') {
    applyStreamEvent(message.source, message.payload);
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
