import { networkLogStore } from './networkLogStore';

const BODY_PREVIEW_LENGTH = 500;

let isPatched = false;
let requestCounter = 0;

function nextRequestId(): string {
  requestCounter += 1;
  return `xhr-${Date.now()}-${requestCounter}`;
}

function previewBody(body: unknown): string | undefined {
  if (body == null) return undefined;
  if (typeof body === 'string') return body.slice(0, BODY_PREVIEW_LENGTH);
  if (typeof FormData !== 'undefined' && body instanceof FormData) return '[FormData]';
  return '[binary body]';
}

export function patchXHR() {
  if (isPatched) return;
  isPatched = true;

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

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
      }
    ).__networkLogId = nextRequestId();
    (this as any).__networkLogMethod = method;
    (this as any).__networkLogUrl = url;

    return originalOpen.call(this, method, url, async ?? true, username, password);
  } as typeof XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.send = function (
    this: XMLHttpRequest,
    body?: Document | XMLHttpRequestBodyInit | null
  ) {
    const xhr = this as unknown as {
      __networkLogId: string;
      __networkLogMethod?: string;
      __networkLogUrl?: string;
      readyState: number;
      status: number;
      responseText: string;
    };
    const id = xhr.__networkLogId ?? nextRequestId();
    const startedAt = Date.now();

    networkLogStore.add({
      id,
      method: (xhr.__networkLogMethod ?? 'GET').toUpperCase(),
      url: xhr.__networkLogUrl ?? '',
      status: 'pending',
      requestBody: previewBody(body),
      startedAt,
    });

    this.addEventListener('readystatechange', function onReadyStateChange() {
      if (xhr.readyState !== XMLHttpRequest.DONE) return;

      const isNetworkFailure = xhr.status === 0;
      networkLogStore.update(id, {
        status: isNetworkFailure ? 'error' : 'success',
        statusCode: xhr.status,
        responseBody:
          typeof xhr.responseText === 'string'
            ? xhr.responseText.slice(0, BODY_PREVIEW_LENGTH)
            : undefined,
        error: isNetworkFailure ? 'Network request failed' : undefined,
        duration: Date.now() - startedAt,
      });
    });

    return originalSend.call(this, body as XMLHttpRequestBodyInit | null);
  } as typeof XMLHttpRequest.prototype.send;
}
