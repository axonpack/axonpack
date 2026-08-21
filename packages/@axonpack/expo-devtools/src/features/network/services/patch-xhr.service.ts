import { captureInitiatorFrames } from './capture-initiator.service';
import { recordStreamEvents } from './record-stream-events.service';
import { encodeBytesToBase64 } from '../../../core/utils/base64.util';
import { EVENT_STREAM_MIME_TYPE } from '../constants/event-stream.const';
import type { ThrottleProfile } from '../constants/throttle-presets.const';
import { networkConditionsStore } from '../stores/network-conditions.store';
import { networkLogStore } from '../stores/network-log.store';
import { networkOverridesStore } from '../stores/network-overrides.store';
import { computeThrottleDelayMs, remainingDelayMs } from '../utils/network-conditions.util';
import { createEventStreamParser, type EventStreamParser } from '../utils/parse-event-stream.util';
import { createProgressThrottle } from '../utils/progress-throttle.util';
import { describeRequestBody } from '../utils/request-body.util';
import {
  sniffContentTypeFromBytes,
  sniffContentTypeFromText,
} from '../utils/sniff-content-type.util';

/** The three fields of a DOM progress event this needs, without depending on the DOM's own type. */
type ProgressEventLike = { loaded: number; total: number; lengthComputable: boolean };

let isPatched = false;
let requestCounter = 0;

type ThrottleState = {
  profile: ThrottleProfile;
  startedAt: number;

  deliverAt?: number;
};

const throttleStates = new WeakMap<XMLHttpRequest, ThrottleState>();

function estimateResponseSize(xhr: XMLHttpRequest): number | undefined {
  try {
    const contentLength = Number(xhr.getResponseHeader('content-length'));
    if (!Number.isNaN(contentLength) && contentLength > 0) return contentLength;
  } catch {}
  try {
    return typeof xhr.responseText === 'string' ? xhr.responseText.length : undefined;
  } catch {
    return undefined;
  }
}

type ResponseBodySource = {
  responseType: string;
  responseText: string;
  response: unknown;
};

/**
 * Past this the bytes are not kept — the same ceiling the fetch patch uses, for the same reason: a
 * base64 copy costs several times the size of what it copies.
 */
const MAX_BINARY_BODY_BYTES = 512 * 1024;

type ReadBody = {
  responseBody?: string;
  responseBase64?: string;
  bodyOmitted?: 'too-large' | 'unreadable';
  sniffedType?: string;
  size?: number;
};

/**
 * An `arraybuffer` response used to be recorded as `[ArrayBuffer 24 bytes]` — enough to know it
 * happened, not enough to see what came back. The bytes are kept now, and asked what they are when
 * no header said.
 */
function readNonTextResponse(xhr: ResponseBodySource): ReadBody {
  try {
    const response: unknown = xhr.response;
    if (response == null) return {};
    if (typeof response === 'string') return { responseBody: response, size: response.length };

    if (typeof ArrayBuffer !== 'undefined' && response instanceof ArrayBuffer) {
      if (response.byteLength > MAX_BINARY_BODY_BYTES) {
        return { bodyOmitted: 'too-large', size: response.byteLength };
      }
      const bytes = new Uint8Array(response);
      return {
        responseBase64: encodeBytesToBase64(bytes),
        sniffedType: sniffContentTypeFromBytes(bytes),
        size: bytes.byteLength,
      };
    }

    // A Blob's bytes are only reachable asynchronously, and the request has already finished by the
    // time this runs, so its shape is all that can be reported.
    if (typeof Blob !== 'undefined' && response instanceof Blob) {
      return {
        bodyOmitted: 'unreadable',
        size: response.size,
        sniffedType: response.type || undefined,
      };
    }

    if (typeof response === 'object') return { responseBody: JSON.stringify(response) };
    return { responseBody: String(response) };
  } catch {
    return { bodyOmitted: 'unreadable' };
  }
}

function readResponseBody(xhr: ResponseBodySource): ReadBody {
  let responseType: string | undefined;
  try {
    responseType = xhr.responseType;
  } catch {
    return { bodyOmitted: 'unreadable' };
  }
  if (responseType !== '' && responseType !== 'text') return readNonTextResponse(xhr);
  try {
    if (typeof xhr.responseText !== 'string') return { bodyOmitted: 'unreadable' };
    return {
      responseBody: xhr.responseText,
      sniffedType: sniffContentTypeFromText(xhr.responseText),
      size: xhr.responseText.length,
    };
  } catch {
    return { bodyOmitted: 'unreadable' };
  }
}

function nextRequestId(): string {
  requestCounter += 1;
  return `xhr-${Date.now()}-${requestCounter}`;
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

/** Undefined rather than empty when the runtime refuses, which is what a failed read means here. */
function readResponseHeaders(xhr: {
  getAllResponseHeaders(): string;
}): Record<string, string> | undefined {
  try {
    return parseResponseHeaders(xhr.getAllResponseHeaders());
  } catch {
    return undefined;
  }
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

/** Replaces a read-only property on the instance, which is all an override needs to be visible. */
function defineReadable(xhr: XMLHttpRequest, name: string, get: () => unknown) {
  try {
    Object.defineProperty(xhr, name, { configurable: true, get });
  } catch {
    // A runtime that refuses is one where the override simply does not apply.
  }
}

/**
 * Answers the app from a rule instead of from the server.
 *
 * Unlike the `fetch` path, **the request still goes out** — there is no seam here that can stand in
 * front of the native send and produce a response, so what is replaced is what the app *reads*
 * afterwards. So an override cannot be used against an endpoint that does not exist, and it still
 * costs the round trip. Blocking is the opposite: that one does prevent the call.
 *
 * Getters are installed at send, rather than assigned from a `readystatechange` listener, because a
 * listener added here runs after the ones the app registered before calling send — it would have
 * masked the values a moment too late, after the app had already read the real ones.
 */
function applyResponseOverride(xhr: XMLHttpRequest, status: number, body: string) {
  defineReadable(xhr, 'status', () => status);
  defineReadable(xhr, 'statusText', () => 'Overridden by devtools');
  defineReadable(xhr, 'responseText', () => body);
  defineReadable(xhr, 'response', () => {
    // The app's own `responseType` is honoured rather than rewritten: an app that asked for `json`
    // expects an object, and handing it the string would break the very code being tested.
    if (xhr.responseType !== 'json') return body;
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  });
}

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
      /** Set by the abort listener, so the DONE handler does not relabel it a network failure. */
      __networkLogCanceled?: boolean;
      /** Set when a rule blocked the request, so the abort it causes is not read as the app's own. */
      __networkLogBlocked?: boolean;
      readyState: number;
      status: number;
      statusText: string;
      responseText: string;
      responseType: string;
      response: unknown;
      getResponseHeader(name: string): string | null;
      getAllResponseHeaders(): string;
    };
    const id = xhr.__networkLogId ?? nextRequestId();
    const startedAt = Date.now();
    const conditions = networkConditionsStore.resolve();

    if (conditions.userAgent) {
      try {
        this.setRequestHeader('User-Agent', conditions.userAgent);
      } catch {}
    }

    if (conditions.throttle) {
      throttleStates.set(this, { profile: conditions.throttle, startedAt });
    }

    const describedBody = describeRequestBody(body);

    networkLogStore.add({
      id,
      method: (xhr.__networkLogMethod ?? 'GET').toUpperCase(),
      url: xhr.__networkLogUrl ?? '',
      status: 'pending',
      requestBody: describedBody.preview,
      requestFields: describedBody.fields,
      requestHeaders: xhr.__networkLogHeaders,
      initiator: captureInitiatorFrames(),
      startedAt,
      source: 'xhr',
      conditions,
    });

    /**
     * Set once the headers say the body is a stream. Its presence is also what tells the handlers
     * below that this request never gets a body of its own — see `readStreamDelta`.
     */
    let parser: EventStreamParser | null = null;
    let consumed = 0;

    /**
     * Reads whatever has been appended to `responseText` since the last look. React Native delivers
     * a growing `responseText` at `LOADING` for as long as something is listening for
     * `readystatechange` or `progress`, which this patch always is — so a stream arrives here in
     * chunks with no extra machinery, whichever client library opened it.
     */
    function readStreamDelta() {
      if (parser === null) return;
      let text: string;
      try {
        text = xhr.responseText;
      } catch {
        // A `responseType` whose text cannot be read is a stream whose events cannot be parsed.
        return;
      }
      if (typeof text !== 'string' || text.length <= consumed) return;
      const chunk = text.slice(consumed);
      consumed = text.length;
      recordStreamEvents(id, parser.push(chunk));
    }

    // Both directions report through the DOM's own progress events, so nothing has to be inferred
    // from byte counts. Readings are throttled: a large body fires hundreds of them, and each one
    // would otherwise write to the store and re-render the list.
    const downloadThrottle = createProgressThrottle();
    this.addEventListener('progress', function onDownloadProgress(event: ProgressEventLike) {
      const now = Date.now();
      if (!downloadThrottle(now, event.loaded === event.total)) return;
      networkLogStore.update(id, {
        progress: {
          direction: 'download',
          loaded: event.loaded,
          total: event.lengthComputable ? event.total : undefined,
        },
      });
    });

    const uploadThrottle = createProgressThrottle();
    // `upload` is a separate event target, and the only place a request body's progress is reported.
    // fetch has no equivalent on any platform, so this is XHR's alone.
    this.upload?.addEventListener('progress', (event: ProgressEventLike) => {
      const now = Date.now();
      if (!uploadThrottle(now, event.loaded === event.total)) return;
      networkLogStore.update(id, {
        progress: {
          direction: 'upload',
          loaded: event.loaded,
          total: event.lengthComputable ? event.total : undefined,
        },
      });
    });

    // Headers arrive one state before the body is complete, which is the only point in an XHR's
    // life where the wait can be told apart from the download.
    this.addEventListener('readystatechange', function onHeadersReceived() {
      if (xhr.readyState !== XMLHttpRequest.HEADERS_RECEIVED) return;
      networkLogStore.update(id, { ttfb: Date.now() - startedAt });

      let declaredType: string | null = null;
      try {
        declaredType = xhr.getResponseHeader('content-type');
      } catch {}
      if (declaredType?.split(';')[0]?.trim().toLowerCase() !== EVENT_STREAM_MIME_TYPE) return;

      parser = createEventStreamParser();
      // Everything a stream's response has to say is already said by now, and a stream can stay open
      // for the rest of the session — so it is recorded here rather than waiting for an end.
      networkLogStore.update(id, {
        eventStream: true,
        statusCode: xhr.status,
        statusText: xhr.statusText,
        responseHeaders: readResponseHeaders(xhr),
        mimeType: EVENT_STREAM_MIME_TYPE,
      });
    });

    // The one state every other response ignores: for a stream it is where the body actually arrives.
    this.addEventListener('readystatechange', function onStreamChunk() {
      if (xhr.readyState !== XMLHttpRequest.LOADING) return;
      readStreamDelta();
    });

    // An abort still reports readyState DONE with status 0, which is indistinguishable from a
    // network failure — so it has to be recorded from the event that says which one it was.
    this.addEventListener('abort', function onAbort() {
      // A blocked request is aborted on purpose, and is already recorded as blocked.
      if (xhr.__networkLogBlocked) return;
      xhr.__networkLogCanceled = true;

      // Closing a stream is how a stream ends: the app calls `close()`, which aborts the request
      // underneath it. Calling that a cancelled request would report a normal end as a failure.
      if (parser !== null) {
        readStreamDelta();
        networkLogStore.update(id, { status: 'success', duration: Date.now() - startedAt });
        return;
      }

      networkLogStore.update(id, {
        status: 'error',
        canceled: true,
        error: 'Canceled',
        duration: Date.now() - startedAt,
      });
    });

    this.addEventListener('readystatechange', function onReadyStateChange() {
      if (xhr.readyState !== XMLHttpRequest.DONE) return;

      const isNetworkFailure = xhr.status === 0;
      const responseHeaders = readResponseHeaders(xhr);

      if (xhr.__networkLogCanceled) return;

      if (parser !== null) {
        readStreamDelta();
        // No `responseBody`: the events are the body, and they are already recorded. Keeping the raw
        // stream text as well would be a second unbounded copy of the same bytes, which is exactly
        // what the cap on events exists to avoid.
        networkLogStore.update(id, {
          status: isNetworkFailure ? 'error' : 'success',
          responseHeaders,
          error: isNetworkFailure ? 'Network request failed' : undefined,
          duration: Date.now() - startedAt,
        });
        return;
      }

      const body = readResponseBody(xhr);

      const declaredType = responseHeaders ? extractMimeType(responseHeaders) : undefined;

      networkLogStore.update(id, {
        status: isNetworkFailure ? 'error' : 'success',
        statusCode: xhr.status,
        statusText: xhr.statusText,
        responseBody: body.responseBody,
        responseBase64: body.responseBase64,
        bodyOmitted: body.bodyOmitted,
        responseHeaders,
        // A declared type wins; the sniffed one only fills the gap where nothing said.
        mimeType: declaredType ?? body.sniffedType,
        size:
          (responseHeaders ? extractSize(responseHeaders, body.responseBody) : undefined) ??
          body.size,
        error: isNetworkFailure ? 'Network request failed' : undefined,
        duration: Date.now() - startedAt,
      });
    });

    const override = networkOverridesStore.find(xhr.__networkLogUrl ?? '');

    if (override?.action === 'block') {
      xhr.__networkLogBlocked = true;
      networkLogStore.update(id, {
        status: 'error',
        intercepted: 'blocked',
        error: 'Blocked by devtools',
        duration: Date.now() - startedAt,
      });
      failAsOffline(this);
      return;
    }

    if (override?.action === 'respond') {
      applyResponseOverride(this, override.status ?? 200, override.body ?? '');
      networkLogStore.update(id, { intercepted: 'overridden' });
    }

    if (conditions.offline) {
      failAsOffline(this);
      return;
    }

    return originalSend.call(this, body as XMLHttpRequestBodyInit | null);
  } as typeof XMLHttpRequest.prototype.send;
}
