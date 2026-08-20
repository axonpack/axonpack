import { consoleLogStore } from '../stores/console-log.store';
import type { ConsoleLogLevel } from '../stores/console-log.store';
import type { ConsoleArg } from '../utils/format-console-args.util';
import { getConsoleArgsText } from '../utils/format-console-args.util';

const MESSAGE_MARKER = '__bruinDevtoolsConsole';

const RELAYED_LEVELS: ConsoleLogLevel[] = ['log', 'info', 'warn', 'error', 'debug'];

type WebViewConsolePayload = {
  level: ConsoleLogLevel;
  parts: ConsoleArg[];
  timestamp: number;
};

type WebViewConsoleMessage = {
  [MESSAGE_MARKER]: true;
  source: string;
  payload: WebViewConsolePayload;
};

type WebViewMessageEventLike = {
  nativeEvent: {
    data: string;
  };
};

let entryCounter = 0;

function nextEntryId(source: string): string {
  entryCounter += 1;
  return `${source}-console-${Date.now()}-${entryCounter}`;
}

export function getWebViewConsoleInjectedJavaScript(webviewName: string): string {
  if (!consoleLogStore.isEnabled()) {
    return 'true;';
  }

  const nameLiteral = JSON.stringify(webviewName);
  const markerLiteral = JSON.stringify(MESSAGE_MARKER);

  return `(function () {
    if (window.__bruinDevtoolsConsolePatched) return;
    window.__bruinDevtoolsConsolePatched = true;

    var WEBVIEW_NAME = ${nameLiteral};
    var MAX_DEPTH = 6;

    // Same queue-until-the-bridge-exists dance the network script does: injected before content
    // loads, so on Android ReactNativeWebView often isn't there for the page's first few logs.
    var outbox = [];
    var flushTimer = null;

    function bridgeReady() {
      return !!(window.ReactNativeWebView && window.ReactNativeWebView.postMessage);
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
        while (outbox.length) {
          try { window.ReactNativeWebView.postMessage(outbox.shift()); } catch (e) {}
        }
      }, 25);
    }

    function describeFunction(value) {
      return value.name ? 'f ' + value.name + '()' : 'f ()';
    }

    function snapshot(value, depth, seen) {
      if (value === null) return null;
      var type = typeof value;
      if (type === 'undefined') return 'undefined';
      if (type === 'string' || type === 'number' || type === 'boolean') return value;
      if (type === 'bigint') return String(value) + 'n';
      if (type === 'symbol') return String(value);
      if (type === 'function') return describeFunction(value);
      if (seen.indexOf(value) !== -1) return '[Circular]';
      if (value instanceof Error) return value.stack || (value.name + ': ' + value.message);
      if (value instanceof Date) return value.toISOString();
      if (value instanceof RegExp) return String(value);
      if (depth >= MAX_DEPTH) return Array.isArray(value) ? '[Array]' : '[Object]';

      seen.push(value);
      try {
        if (Array.isArray(value)) {
          var list = [];
          for (var i = 0; i < value.length; i++) list.push(snapshot(value[i], depth + 1, seen));
          return list;
        }
        if (typeof Set !== 'undefined' && value instanceof Set) {
          var fromSet = [];
          value.forEach(function (item) { fromSet.push(snapshot(item, depth + 1, seen)); });
          return fromSet;
        }
        if (typeof Map !== 'undefined' && value instanceof Map) {
          var fromMap = {};
          value.forEach(function (item, key) { fromMap[String(key)] = snapshot(item, depth + 1, seen); });
          return fromMap;
        }
        var out = {};
        var keys = Object.keys(value);
        for (var k = 0; k < keys.length; k++) {
          try { out[keys[k]] = snapshot(value[keys[k]], depth + 1, seen); }
          catch (e) { out[keys[k]] = '[Threw]'; }
        }
        return out;
      } finally {
        seen.splice(seen.indexOf(value), 1);
      }
    }

    function toArg(value) {
      if (value === null) return { kind: 'primitive', text: 'null', tone: 'muted' };
      var type = typeof value;
      if (type === 'undefined') return { kind: 'primitive', text: 'undefined', tone: 'muted' };
      if (type === 'string') return { kind: 'primitive', text: value, tone: 'plain' };
      if (type === 'number') return { kind: 'primitive', text: String(value), tone: 'number' };
      if (type === 'boolean') return { kind: 'primitive', text: String(value), tone: 'boolean' };
      if (type === 'bigint') return { kind: 'primitive', text: String(value) + 'n', tone: 'number' };
      if (type === 'symbol') return { kind: 'primitive', text: String(value), tone: 'muted' };
      if (type === 'function') return { kind: 'primitive', text: describeFunction(value), tone: 'muted' };
      if (value instanceof Error) {
        return { kind: 'error', text: value.name + ': ' + value.message, stack: value.stack };
      }
      if (value instanceof Date) return { kind: 'primitive', text: value.toISOString(), tone: 'muted' };
      if (value instanceof RegExp) return { kind: 'primitive', text: String(value), tone: 'muted' };
      if (typeof Map !== 'undefined' && value instanceof Map) {
        return { kind: 'json', label: 'Map(' + value.size + ')', value: snapshot(value, 0, []) };
      }
      if (typeof Set !== 'undefined' && value instanceof Set) {
        return { kind: 'json', label: 'Set(' + value.size + ')', value: snapshot(value, 0, []) };
      }
      if (Array.isArray(value)) {
        return { kind: 'json', label: 'Array(' + value.length + ')', value: snapshot(value, 0, []) };
      }
      var name = value.constructor && value.constructor.name;
      return {
        kind: 'json',
        label: name && name !== 'Object' ? name : undefined,
        value: snapshot(value, 0, [])
      };
    }

    var LEVELS = ['log', 'info', 'warn', 'error', 'debug'];

    for (var index = 0; index < LEVELS.length; index++) {
      (function (level) {
        var original = window.console && window.console[level];
        if (!original) return;
        window.console[level] = function () {
          var args = Array.prototype.slice.call(arguments);
          try {
            var parts = [];
            for (var a = 0; a < args.length; a++) parts.push(toArg(args[a]));
            var message = {};
            message[${markerLiteral}] = true;
            message.source = WEBVIEW_NAME;
            message.payload = { level: level, parts: parts, timestamp: Date.now() };
            send(message);
          } catch (e) {}
          // Called through so the page's own devtools/remote debugger still see normal output.
          return original.apply(window.console, args);
        };
      })(LEVELS[index]);
    }
  })();
  true;`;
}

export function handleWebViewConsoleMessage(
  event: WebViewMessageEventLike,
  allowedSources?: readonly string[]
): boolean {
  if (!consoleLogStore.isEnabled()) return false;

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

  const message = parsed as WebViewConsoleMessage;

  if (allowedSources && !allowedSources.includes(message.source)) {
    return false;
  }

  const payload = message.payload;
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !RELAYED_LEVELS.includes(payload.level) ||
    !Array.isArray(payload.parts)
  ) {
    return false;
  }

  consoleLogStore.add({
    id: nextEntryId(message.source),
    level: payload.level,
    parts: payload.parts,
    text: getConsoleArgsText(payload.parts),
    timestamp: typeof payload.timestamp === 'number' ? payload.timestamp : Date.now(),
    count: 1,
    source: message.source,
  });

  return true;
}
