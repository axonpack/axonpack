import { captureInitiatorFrames } from './capture-initiator.service';
import { recordStreamEvents } from './record-stream-events.service';
import { encodeBytesToBase64 } from '../../../core/utils/base64.util';
import { rememberUnpatchedFetch } from '../../../core/utils/unpatched-fetch.util';
import { EVENT_STREAM_MIME_TYPE } from '../constants/event-stream.const';
import { NETWORK_SOURCES } from '../constants/sources.const';
import { networkConditionsStore } from '../stores/network-conditions.store';
import { networkLogStore } from '../stores/network-log.store';
import { networkOverridesStore } from '../stores/network-overrides.store';
import {
  computeThrottleDelayMs,
  delay,
  remainingDelayMs,
  withUserAgentHeader,
} from '../utils/network-conditions.util';
import { createEventStreamParser } from '../utils/parse-event-stream.util';
import { createProgressThrottle } from '../utils/progress-throttle.util';
import { describeRequestBody } from '../utils/request-body.util';
import {
  isTextLikeContentType,
  sniffContentTypeFromBytes,
  sniffContentTypeFromText,
} from '../utils/sniff-content-type.util';

/**
 * Expo's fetch lives in a module of its own, and `import { fetch } from 'expo/fetch'` never reads
 * `globalThis.fetch` — so patching the global cannot see a single one of those calls. This is the
 * innermost module rather than the `expo/fetch` subpath, because the subpath re-exports from here and
 * patching this one covers both. The path is private and unversioned, which is why every use of it is
 * guarded.
 */
const EXPO_FETCH_MODULE = 'expo/src/winter/fetch/fetch';

type ExpoFetchModule = { fetch: typeof globalThis.fetch };

declare const require: (id: string) => unknown;

let isPatched = false;
let requestCounter = 0;

function nextRequestId(): string {
  requestCounter += 1;
  return `fetch-${Date.now()}-${requestCounter}`;
}

function resolveMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method;
  if (typeof Request !== 'undefined' && input instanceof Request) return input.method;
  return 'GET';
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
  return String(input);
}

/**
 * A cancelled request rejects like a failed one. `AbortError` covers a signal the app aborted and
 * `TimeoutError` a deadline it set; the message check is the fallback for runtimes that report
 * neither — RN has shipped more than one shape of this error.
 */
function isAbortError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { name, message } = error as { name?: string; message?: string };
  return (
    name === 'AbortError' ||
    name === 'TimeoutError' ||
    message?.toLowerCase().includes('abort') === true
  );
}

/**
 * Counts the body through as it arrives, so a slow download reports progress rather than appearing
 * finished all at once. Reads its own clone and never the response the app gets back, and is
 * deliberately not awaited — awaiting it here would hold the request until the body was complete,
 * which is exactly the wait it exists to make visible.
 *
 * Bytes are counted, not kept: the body itself is still read as text elsewhere, because decoding
 * chunks by hand would need a TextDecoder that React Native does not reliably provide.
 */
async function trackDownloadProgress(clone: Response, id: string, total?: number) {
  const reader = clone.body?.getReader();
  if (!reader) return;

  const throttle = createProgressThrottle();
  let loaded = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    loaded += value.byteLength;
    if (throttle(Date.now())) {
      networkLogStore.update(id, { progress: { direction: 'download', loaded, total } });
    }
  }

  networkLogStore.update(id, { progress: { direction: 'download', loaded, total } });
}

/**
 * Reads a stream as it arrives and records each event. Like the progress tracker above it reads its
 * own clone and is never awaited — but here that is not an optimisation: `text()` on a body with no
 * end would hold the app's own `await fetch(...)` open for as long as the stream lived.
 *
 * `TextDecoder` is Expo's, installed by its runtime rather than React Native's. Where it is missing
 * the request is still recorded as a stream, just without its events: a hand-rolled decoder that
 * mangled anything past ASCII would be worse than saying nothing. A chunk is handed over as a
 * `DataView` because a stream's `Uint8Array` is often a window onto a larger buffer.
 */
async function readEventStream(clone: Response, id: string, startedAt: number) {
  const reader = clone.body?.getReader();
  if (!reader) return;

  if (typeof TextDecoder === 'undefined') {
    // Said rather than left as an empty list: a stream with no events looks the same as one nobody
    // could read, and on a runtime with no decoder it is always the second.
    networkLogStore.update(id, { bodyOmitted: 'unreadable' });
    return;
  }

  const decoder = new TextDecoder();
  const parser = createEventStreamParser();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    const view = new DataView(value.buffer, value.byteOffset, value.byteLength);
    recordStreamEvents(id, parser.push(decoder.decode(view, { stream: true })));
  }

  // Flushes whatever multi-byte character the last chunk cut in half.
  recordStreamEvents(id, parser.push(decoder.decode()));
  networkLogStore.update(id, { duration: Date.now() - startedAt });
}

/**
 * Past this, the bytes are not kept. Text bodies are still stored whole — a request whose body you
 * cannot read is one you cannot debug — but a base64 copy of a video costs several times its own
 * size in memory, and no panel is going to show it.
 */
const MAX_BINARY_BODY_BYTES = 512 * 1024;

type CapturedBody = {
  responseBody?: string;
  responseBase64?: string;
  bodyOmitted?: 'too-large' | 'unreadable';
  /** What the bytes turned out to be, when no header said. */
  sniffedType?: string;
  size?: number;
};

/**
 * Reads the body once, as whatever it is. The declared content type decides, and when nothing
 * declared one the bytes are asked instead — a response with no `Content-Type` is common from a
 * hand-rolled server, and calling it text shows an image as mojibake.
 */
async function captureBody(
  response: Response,
  declaredType: string | undefined
): Promise<CapturedBody> {
  if (isTextLikeContentType(declaredType)) {
    try {
      const text = await response.clone().text();
      return {
        responseBody: text,
        sniffedType: declaredType ? undefined : sniffContentTypeFromText(text),
        size: text.length,
      };
    } catch {
      return { bodyOmitted: 'unreadable' };
    }
  }

  try {
    const buffer = await response.clone().arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.byteLength > MAX_BINARY_BODY_BYTES) {
      return { bodyOmitted: 'too-large', size: bytes.byteLength };
    }
    return {
      responseBase64: encodeBytesToBase64(bytes),
      sniffedType: declaredType ? undefined : sniffContentTypeFromBytes(bytes),
      size: bytes.byteLength,
    };
  } catch {
    return { bodyOmitted: 'unreadable' };
  }
}

function normalizeHeaders(headers: HeadersInit | undefined): Record<string, string> | undefined {
  if (!headers) return undefined;
  const result: Record<string, string> = {};
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  if (Array.isArray(headers)) {
    for (const [key, value] of headers) result[key] = value;
    return result;
  }
  return { ...(headers as Record<string, string>) };
}

function headersFromResponse(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
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
 * Every wrapper is handed the *raw* function it is standing in front of, never another wrapper. Two
 * of these can be live at once — one on the global, one on Expo's module — and if either called
 * through the other, a single request would be logged twice.
 */
function instrument(rawFetch: typeof globalThis.fetch, source: string): typeof globalThis.fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const id = nextRequestId();
    const startedAt = Date.now();
    const conditions = networkConditionsStore.resolve();
    const requestHeaders = normalizeHeaders(
      init?.headers ??
        (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined)
    );

    const effectiveHeaders = conditions.userAgent
      ? withUserAgentHeader(requestHeaders, conditions.userAgent)
      : requestHeaders;
    const effectiveInit = conditions.userAgent ? { ...init, headers: effectiveHeaders } : init;
    const describedBody = describeRequestBody(init?.body);

    networkLogStore.add({
      id,
      method: resolveMethod(input, init).toUpperCase(),
      url: resolveUrl(input),
      status: 'pending',
      requestBody: describedBody.preview,
      requestFields: describedBody.fields,
      requestHeaders: effectiveHeaders,
      startedAt,
      source,
      conditions,
      initiator: captureInitiatorFrames(),
    });

    // Consulted after the entry is logged, so a blocked or overridden request is still a row — one
    // that never appeared would look like the app not having asked at all.
    const override = networkOverridesStore.find(resolveUrl(input));

    if (override?.action === 'block') {
      networkLogStore.update(id, {
        status: 'error',
        intercepted: 'blocked',
        error: 'Blocked by devtools',
        duration: Date.now() - startedAt,
      });
      throw new TypeError('Network request failed');
    }

    if (override?.action === 'respond') {
      const status = override.status ?? 200;
      const contentType = override.contentType ?? 'application/json';
      const body = override.body ?? '';
      // Built here instead of after a real request, so the network is never reached at all — an
      // overridden endpoint does not have to exist.
      networkLogStore.update(id, {
        status: status >= 400 ? 'error' : 'success',
        intercepted: 'overridden',
        statusCode: status,
        statusText: 'Overridden by devtools',
        responseBody: body,
        responseHeaders: { 'content-type': contentType },
        mimeType: contentType.split(';')[0]?.trim().toLowerCase(),
        size: body.length,
        ttfb: 0,
        duration: Date.now() - startedAt,
      });
      return new Response(body, {
        status,
        statusText: 'Overridden by devtools',
        headers: { 'content-type': contentType },
      });
    }

    if (conditions.offline) {
      const offlineError = new TypeError('Network request failed');
      networkLogStore.update(id, {
        status: 'error',
        error: 'Network request failed (offline — simulated by devtools)',
        duration: Date.now() - startedAt,
      });
      throw offlineError;
    }

    try {
      const response = await rawFetch(input, effectiveInit);
      // The promise resolves once the headers are in, before the body is read — so this is the wait,
      // and whatever follows is the download.
      const ttfb = Date.now() - startedAt;

      const responseHeaders = headersFromResponse(response.headers);
      const declaredType = extractMimeType(responseHeaders);

      if (declaredType === EVENT_STREAM_MIME_TYPE) {
        // Nothing about a stream can be awaited, so everything the response has to say is recorded
        // now and the events follow as they arrive. The progress tracker is skipped rather than run
        // beside this: bytes-so-far of an endless body says less than the event count does, and one
        // reader on one clone is one less tee of a live stream.
        networkLogStore.update(id, {
          status: 'success',
          statusCode: response.status,
          statusText: response.statusText,
          responseHeaders,
          mimeType: declaredType,
          eventStream: true,
          ttfb,
        });
        readEventStream(response.clone(), id, startedAt).catch(() => {
          // A stream that cannot be read is a row without its events, not a failed request.
        });
        return response;
      }

      const declaredLength = Number(response.headers.get('content-length'));
      // Not awaited: awaiting it would hold the request until the body was complete, which is the
      // wait it exists to make visible.
      trackDownloadProgress(
        response.clone(),
        id,
        Number.isNaN(declaredLength) || declaredLength <= 0 ? undefined : declaredLength
      ).catch(() => {
        // A stream that cannot be read is a progress bar we do not draw, not a failed request.
      });

      const captured = await captureBody(response, declaredType);
      const size = extractSize(responseHeaders, captured.responseBody) ?? captured.size;

      if (conditions.throttle) {
        await delay(
          remainingDelayMs(
            computeThrottleDelayMs(size, conditions.throttle),
            Date.now() - startedAt
          )
        );
      }

      networkLogStore.update(id, {
        status: 'success',
        statusCode: response.status,
        statusText: response.statusText,
        responseHeaders,
        responseBody: captured.responseBody,
        responseBase64: captured.responseBase64,
        bodyOmitted: captured.bodyOmitted,
        mimeType: declaredType ?? captured.sniffedType,
        size,
        ttfb,
        duration: Date.now() - startedAt,
      });

      return response;
    } catch (error) {
      const canceled = isAbortError(error);
      networkLogStore.update(id, {
        status: 'error',
        canceled,
        error: canceled ? 'Canceled' : error instanceof Error ? error.message : String(error),
        duration: Date.now() - startedAt,
      });
      throw error;
    }
  }) as typeof fetch;
}

/** Returns whether the export could be replaced — a getter-only property cannot be. */
function patchExpoFetchModule(): boolean {
  let expoFetch: ExpoFetchModule;
  try {
    expoFetch = require(EXPO_FETCH_MODULE) as ExpoFetchModule;
  } catch {
    return false;
  }

  if (typeof expoFetch?.fetch !== 'function') return false;

  const descriptor = Object.getOwnPropertyDescriptor(expoFetch, 'fetch');
  if (descriptor && !descriptor.writable && !descriptor.set) return false;

  const rawExpoFetch = expoFetch.fetch;
  try {
    expoFetch.fetch = instrument(rawExpoFetch, NETWORK_SOURCES.expoFetch);
  } catch {
    return false;
  }
  return true;
}

export function patchFetch() {
  if (isPatched) return;
  isPatched = true;

  const originalFetch = globalThis.fetch;
  rememberUnpatchedFetch(originalFetch);

  // The global goes first, so the module still holds its raw function when the next line reads it.
  globalThis.fetch = instrument(originalFetch, NETWORK_SOURCES.fetch);
  patchExpoFetchModule();
}
