import type { Palette } from '../../../core/constants/theme.const';
import { isNativeSource } from '../constants/sources.const';
import type { NetworkLogStatus } from '../stores/network-log.store';

export function isErrorStatus(status: NetworkLogStatus, statusCode?: number): boolean {
  return status === 'error' || (statusCode !== undefined && statusCode >= 400);
}

export function getStatusColor(
  status: NetworkLogStatus,
  statusCode: number | undefined,
  COLORS: Palette
): string {
  switch (status) {
    case 'error':
      return COLORS.error;
    case 'pending':
      return COLORS.pending;
    default:
      return statusCode !== undefined && statusCode >= 400 ? COLORS.error : COLORS.success;
  }
}

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

export function getMethodColor(method: string, COLORS: Palette): string {
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

/**
 * A source this package minted reads as itself; anything else is a WebView name the consumer
 * declared, and says which WebView it came from. Checked against the list rather than against two
 * literals, which is what used to label React Native's own sockets as WebView traffic.
 */
export function formatSource(source: string): string {
  if (isNativeSource(source)) return source;
  return `WebView::[${source}]`;
}

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
