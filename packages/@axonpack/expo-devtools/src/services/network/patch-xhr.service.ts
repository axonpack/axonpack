import type { ThrottleProfile } from '../../constants/network/throttle-presets.const';
import { networkConditionsStore } from '../../stores/network/network-conditions.store';
import { networkLogStore } from '../../stores/network/network-log.store';
import {
  computeThrottleDelayMs,
  remainingDelayMs,
} from '../../utils/network/network-conditions.util';

let isPatched = false;
let requestCounter = 0;

type ThrottleState = {
  profile: ThrottleProfile;
  startedAt: number;
  /** Absolute time the DONE transition should land, computed once so every event stays ordered. */
  deliverAt?: number;
};

const throttleStates = new WeakMap<XMLHttpRequest, ThrottleState>();

function estimateResponseSize(xhr: XMLHttpRequest): number | undefined {
  try {
    const contentLength = Number(xhr.getResponseHeader('content-length'));
    if (!Number.isNaN(contentLength) && contentLength > 0) return contentLength;
  } catch {
    // getResponseHeader throws before headers are available — fall through to the body length.
  }
  try {
    return typeof xhr.responseText === 'string' ? xhr.responseText.length : undefined;
  } catch {
    // responseText throws for a non-text responseType; size just stays unknown.
    return undefined;
  }
}

function nextRequestId(): string {
  requestCounter += 1;
  return `xhr-${Date.now()}-${requestCounter}`;
}

function previewBody(body: unknown): string | undefined {
  if (body == null) return undefined;
  if (typeof body === 'string') return body;
  if (typeof FormData !== 'undefined' && body instanceof FormData) return '[FormData]';
  return '[binary body]';
}

function parseResponseHeaders(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.trim().split(/[\r\n]+/)) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex < 0) continue;
    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

function extractMimeType(headers: Record<string, string>): string | undefined {
  return headers['content-type']?.split(';')[0]?.trim().toLowerCase();
}

function extractSize(
  headers: Record<string, string>,
  body: string | undefined
): number | undefined {
  const contentLength = Number(headers['content-length']);
  if (!Number.isNaN(contentLength) && headers['content-length']) return contentLength;
  return body?.length;
}

/**
 * `setReadyState` is React Native's own single dispatch point for the terminal XHR events —
 * `readystatechange`, then one of `load`/`error`/`timeout`/`abort`, then `loadend`. Deferring the
 * DONE transition here throttles every listener at once and lets RN's dispatcher keep its own
 * `this` semantics, instead of wrapping each listener individually.
 *
 * It isn't a standard DOM method, so this is a no-op on any runtime that lacks it — logging still
 * works there, only XHR throttling is skipped.
 */
function patchSetReadyState() {
  const proto = XMLHttpRequest.prototype as unknown as {
    setReadyState?: (newState: number) => void;
  };
  const originalSetReadyState = proto.setReadyState;
  if (typeof originalSetReadyState !== 'function') return;

  proto.setReadyState = function (this: XMLHttpRequest, newState: number) {
    const state = throttleStates.get(this);
    if (!state || newState !== XMLHttpRequest.DONE) {
      originalSetReadyState.call(this, newState);
      return;
    }

    if (state.deliverAt === undefined) {
      state.deliverAt =
        state.startedAt + computeThrottleDelayMs(estimateResponseSize(this), state.profile);
    }

    const wait = remainingDelayMs(state.deliverAt, Date.now());
    if (wait <= 0) {
      originalSetReadyState.call(this, newState);
      return;
    }
    setTimeout(() => originalSetReadyState.call(this, newState), wait);
  };
}

/**
 * Drives RN's own failure path without ever hitting the network: it sets the error flag, moves to
 * DONE, and dispatches `error` + `loadend` exactly like a real connection failure would. Falls
 * back to `abort()` on a runtime without it — a less accurate signal, but still a failed request.
 */
function failAsOffline(xhr: XMLHttpRequest) {
  const internal = xhr as unknown as {
    __didCompleteResponse?: (requestId: unknown, error: string, timeOutError: boolean) => void;
    _requestId?: unknown;
  };
  if (typeof internal.__didCompleteResponse === 'function') {
    internal.__didCompleteResponse(internal._requestId ?? null, 'Network request failed', false);
    return;
  }
  xhr.abort();
}

export function patchXHR() {
  if (isPatched) return;
  isPatched = true;

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  patchSetReadyState();

  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    method: string,
    url: string,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ) {
    (
      this as unknown as {
        __networkLogId?: string;
        __networkLogMethod?: string;
        __networkLogUrl?: string;
        __networkLogHeaders?: Record<string, string>;
      }
    ).__networkLogId = nextRequestId();
    (this as any).__networkLogMethod = method;
    (this as any).__networkLogUrl = url;
    (this as any).__networkLogHeaders = {};

    return originalOpen.call(this, method, url, async ?? true, username, password);
  } as typeof XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.setRequestHeader = function (
    this: XMLHttpRequest,
    name: string,
    value: string
  ) {
    const headers = (this as any).__networkLogHeaders as Record<string, string> | undefined;
    if (headers) headers[name] = value;
    return originalSetRequestHeader.call(this, name, value);
  };

  XMLHttpRequest.prototype.send = function (
    this: XMLHttpRequest,
    body?: Document | XMLHttpRequestBodyInit | null
  ) {
    const xhr = this as unknown as {
      __networkLogId: string;
      __networkLogMethod?: string;
      __networkLogUrl?: string;
      __networkLogHeaders?: Record<string, string>;
      readyState: number;
      status: number;
      statusText: string;
      responseText: string;
    };
    const id = xhr.__networkLogId ?? nextRequestId();
    const startedAt = Date.now();
    const conditions = networkConditionsStore.resolve();

    // Set before the log entry is built so the override shows up in the recorded request headers
    // — the patched setRequestHeader above writes it into __networkLogHeaders on the way through.
    if (conditions.userAgent) {
      try {
        this.setRequestHeader('User-Agent', conditions.userAgent);
      } catch {
        // Some runtimes reject User-Agent as a forbidden header; the request still goes out.
      }
    }

    if (conditions.throttle) {
      throttleStates.set(this, { profile: conditions.throttle, startedAt });
    }

    networkLogStore.add({
      id,
      method: (xhr.__networkLogMethod ?? 'GET').toUpperCase(),
      url: xhr.__networkLogUrl ?? '',
      status: 'pending',
      requestBody: previewBody(body),
      requestHeaders: xhr.__networkLogHeaders,
      startedAt,
      source: 'xhr',
      conditions,
    });

    this.addEventListener('readystatechange', function onReadyStateChange() {
      if (xhr.readyState !== XMLHttpRequest.DONE) return;

      const isNetworkFailure = xhr.status === 0;
      const responseBody = typeof xhr.responseText === 'string' ? xhr.responseText : undefined;
      let responseHeaders: Record<string, string> | undefined;
      try {
        responseHeaders = parseResponseHeaders(this.getAllResponseHeaders());
      } catch {
        responseHeaders = undefined;
      }

      networkLogStore.update(id, {
        status: isNetworkFailure ? 'error' : 'success',
        statusCode: xhr.status,
        statusText: xhr.statusText,
        responseBody,
        responseHeaders,
        mimeType: responseHeaders ? extractMimeType(responseHeaders) : undefined,
        size: responseHeaders ? extractSize(responseHeaders, responseBody) : responseBody?.length,
        error: isNetworkFailure ? 'Network request failed' : undefined,
        duration: Date.now() - startedAt,
      });
    });

    if (conditions.offline) {
      failAsOffline(this);
      return;
    }

    return originalSend.call(this, body as XMLHttpRequestBodyInit | null);
  } as typeof XMLHttpRequest.prototype.send;
}
