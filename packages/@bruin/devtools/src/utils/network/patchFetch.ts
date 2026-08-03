import { networkLogStore } from './networkLogStore';

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
 * Expo installs its own native `fetch` (expo/winter/fetch) by default, which does NOT
 * go through `XMLHttpRequest` like classic React Native's whatwg-fetch polyfill did.
 * That's why this needs its own patch alongside patchXHR — one covers fetch, the other
 * covers axios and raw XHR, and neither overlaps with the other in this setup.
 */
export function patchFetch() {
  if (isPatched) return;
  isPatched = true;

  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const id = nextRequestId();
    const startedAt = Date.now();
    const requestHeadersSource =
      init?.headers ??
      (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined);

    networkLogStore.add({
      id,
      method: resolveMethod(input, init).toUpperCase(),
      url: resolveUrl(input),
      status: 'pending',
      requestBody: previewBody(init?.body),
      requestHeaders: normalizeHeaders(requestHeadersSource),
      startedAt,
      source: 'fetch',
    });

    try {
      const response = await originalFetch(input, init);

      let responseBody: string | undefined;
      try {
        responseBody = await response.clone().text();
      } catch {
        responseBody = undefined;
      }

      const responseHeaders = headersFromResponse(response.headers);

      networkLogStore.update(id, {
        status: 'success',
        statusCode: response.status,
        statusText: response.statusText,
        responseBody,
        responseHeaders,
        mimeType: extractMimeType(responseHeaders),
        size: extractSize(responseHeaders, responseBody),
        duration: Date.now() - startedAt,
      });

      return response;
    } catch (error) {
      networkLogStore.update(id, {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startedAt,
      });
      throw error;
    }
  }) as typeof fetch;
}
