import { networkLogStore } from './networkLogStore';

let isPatched = false;
let requestCounter = 0;

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

export function patchXHR() {
  if (isPatched) return;
  isPatched = true;

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

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

    networkLogStore.add({
      id,
      method: (xhr.__networkLogMethod ?? 'GET').toUpperCase(),
      url: xhr.__networkLogUrl ?? '',
      status: 'pending',
      requestBody: previewBody(body),
      requestHeaders: xhr.__networkLogHeaders,
      startedAt,
      source: 'xhr',
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

    return originalSend.call(this, body as XMLHttpRequestBodyInit | null);
  } as typeof XMLHttpRequest.prototype.send;
}
