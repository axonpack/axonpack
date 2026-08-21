import { captureInitiatorFrames } from './capture-initiator.service';
import { rememberUnpatchedFetch } from '../../../core/utils/unpatched-fetch.util';
import { networkConditionsStore } from '../stores/network-conditions.store';
import { networkLogStore } from '../stores/network-log.store';
import {
  computeThrottleDelayMs,
  delay,
  remainingDelayMs,
  withUserAgentHeader,
} from '../utils/network-conditions.util';

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

function previewBody(body: BodyInit | null | undefined): string | undefined {
  if (body == null) return undefined;
  if (typeof body === 'string') return body;
  if (typeof FormData !== 'undefined' && body instanceof FormData) return '[FormData]';
  return '[binary body]';
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

    networkLogStore.add({
      id,
      method: resolveMethod(input, init).toUpperCase(),
      url: resolveUrl(input),
      status: 'pending',
      requestBody: previewBody(init?.body),
      requestHeaders: effectiveHeaders,
      startedAt,
      source,
      conditions,
      initiator: captureInitiatorFrames(),
    });

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

      let responseBody: string | undefined;
      try {
        responseBody = await response.clone().text();
      } catch {
        responseBody = undefined;
      }

      const responseHeaders = headersFromResponse(response.headers);
      const size = extractSize(responseHeaders, responseBody);

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
        responseBody,
        responseHeaders,
        mimeType: extractMimeType(responseHeaders),
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
    expoFetch.fetch = instrument(rawExpoFetch, 'expo/fetch');
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
  globalThis.fetch = instrument(originalFetch, 'fetch');
  patchExpoFetchModule();
}
