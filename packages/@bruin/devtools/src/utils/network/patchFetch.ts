import { networkLogStore } from './networkLogStore';

const BODY_PREVIEW_LENGTH = 500;

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
  if (typeof body === 'string') return body.slice(0, BODY_PREVIEW_LENGTH);
  if (typeof FormData !== 'undefined' && body instanceof FormData) return '[FormData]';
  return '[binary body]';
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

    networkLogStore.add({
      id,
      method: resolveMethod(input, init).toUpperCase(),
      url: resolveUrl(input),
      status: 'pending',
      requestBody: previewBody(init?.body),
      startedAt,
    });

    try {
      const response = await originalFetch(input, init);

      let responseBody: string | undefined;
      try {
        responseBody = (await response.clone().text()).slice(0, BODY_PREVIEW_LENGTH);
      } catch {
        responseBody = undefined;
      }

      networkLogStore.update(id, {
        status: 'success',
        statusCode: response.status,
        responseBody,
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
