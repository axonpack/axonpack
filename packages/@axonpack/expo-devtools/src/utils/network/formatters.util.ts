import { COLORS } from '../../constants/colors.const';
import type { NetworkLogStatus } from '../../stores/network/network-log.store';

/**
 * `status` alone only reflects whether the fetch/XHR call itself completed — `fetch()` and XHR
 * both resolve normally on a 4xx/5xx response, so a 503 comes through as `'success'`. Pass
 * `statusCode` too to color those as errors, matching Chrome DevTools.
 */
export function getStatusColor(status: NetworkLogStatus, statusCode?: number): string {
  switch (status) {
    case 'error':
      return COLORS.error;
    case 'pending':
      return COLORS.pending;
    default:
      return statusCode !== undefined && statusCode >= 400 ? COLORS.error : COLORS.success;
  }
}

// Standard HTTP reason phrases (RFC 9110 + common extensions), matching Node's http.STATUS_CODES.
// Used as a fallback since RN's fetch/XHR implementations don't always populate `statusText`.
const HTTP_STATUS_TEXTS: Record<number, string> = {
  100: 'Continue',
  101: 'Switching Protocols',
  102: 'Processing',
  103: 'Early Hints',
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  205: 'Reset Content',
  206: 'Partial Content',
  207: 'Multi-Status',
  208: 'Already Reported',
  226: 'IM Used',
  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  305: 'Use Proxy',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  412: 'Precondition Failed',
  413: 'Payload Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type',
  416: 'Range Not Satisfiable',
  417: 'Expectation Failed',
  418: "I'm a Teapot",
  421: 'Misdirected Request',
  422: 'Unprocessable Entity',
  423: 'Locked',
  424: 'Failed Dependency',
  425: 'Too Early',
  426: 'Upgrade Required',
  428: 'Precondition Required',
  429: 'Too Many Requests',
  431: 'Request Header Fields Too Large',
  451: 'Unavailable For Legal Reasons',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  506: 'Variant Also Negotiates',
  507: 'Insufficient Storage',
  508: 'Loop Detected',
  510: 'Not Extended',
  511: 'Network Authentication Required',
};

/**
 * Our own mapped reason phrase leads (e.g. "OK" for 200) since some runtimes report a
 * `statusText` that isn't the real reason phrase at all (observed: "no error" for a 200) — the
 * server/runtime value is only appended in brackets when it disagrees with our mapping, e.g.
 * "OK (no error)". Falls back to the raw statusText for a status code we don't have mapped.
 */
export function getStatusText(
  statusCode: number,
  statusText: string | undefined
): string | undefined {
  const mapped = HTTP_STATUS_TEXTS[statusCode];
  const reported = statusText?.trim();
  if (!mapped) return reported;
  if (reported && reported.toLowerCase() !== mapped.toLowerCase()) return `${mapped} (${reported})`;
  return mapped;
}

/** Color-codes an HTTP method the way most API tooling does (GET blue, POST green, mutate-in-place amber, DELETE red). */
export function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return COLORS.accent;
    case 'POST':
      return COLORS.success;
    case 'PUT':
    case 'PATCH':
      return COLORS.warning;
    case 'DELETE':
      return COLORS.error;
    default:
      return COLORS.textSecondary;
  }
}

export function formatSize(bytes: number | undefined): string {
  if (bytes === undefined) return '–';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * `entry.source` is 'fetch'/'xhr' for native requests, or the WebView's own name for anything
 * captured via the injected script (see webview-network-logger.service.ts) — the only way to
 * tell those apart is that a WebView name is never literally 'fetch' or 'xhr'.
 */
export function formatSource(source: string): string {
  if (source === 'fetch' || source === 'xhr') return source;
  return `WebView::[${source}]`;
}

/** Last path segment plus the query string, matching Chrome's "Name" column (used for big rows). */
export function getDisplayNameWithQuery(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const name =
      segments.length > 0 ? decodeURIComponent(segments[segments.length - 1]) : parsed.hostname;
    return parsed.search ? `${name}${parsed.search}` : name;
  } catch {
    return url;
  }
}
