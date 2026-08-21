import { networkLogStore } from '../../stores/network-log.store';
import { patchXHR } from '../patch-xhr.service';

class FakeXHR {
  static readonly HEADERS_RECEIVED = 2;
  static readonly DONE = 4;
  readyState = FakeXHR.DONE;
  status = 200;
  statusText = 'OK';
  responseType = '';
  response: unknown = '';

  // Keyed by type, because the patch registers three listeners and firing all of them for every
  // event made an aborted request out of a completed one.
  #listeners: Record<string, (() => void)[]> = {};

  get responseText(): string {
    if (this.responseType !== '' && this.responseType !== 'text') {
      throw new Error(
        `Failed to read the 'responseText' property from 'XMLHttpRequest': the value is only accessible if responseType is '' or 'text' (was '${this.responseType}')`
      );
    }
    return this.response as string;
  }

  open() {}
  send() {}
  setRequestHeader() {}
  getAllResponseHeaders() {
    return 'content-type: application/json';
  }
  getResponseHeader() {
    return null;
  }
  addEventListener(type: string, listener: () => void) {
    (this.#listeners[type] ??= []).push(listener);
  }
  abort() {
    this.emit('abort');
  }

  emit(type: string) {
    for (const listener of this.#listeners[type] ?? []) listener.call(this);
  }

  /** Headers first, then completion — the order a real request reports them in. */
  finish() {
    this.readyState = FakeXHR.HEADERS_RECEIVED;
    this.emit('readystatechange');
    this.readyState = FakeXHR.DONE;
    this.emit('readystatechange');
  }
}

function runRequest(responseType: string, response: unknown) {
  const xhr = new FakeXHR();
  xhr.responseType = responseType;
  xhr.response = response;
  xhr.open();
  xhr.send();
  xhr.finish();
  return xhr;
}

describe('patchXHR response body reads', () => {
  const original = globalThis.XMLHttpRequest;

  beforeAll(() => {
    // @ts-expect-error deliberately swapping in a stand-in for the real class
    globalThis.XMLHttpRequest = FakeXHR;
    patchXHR();
    networkLogStore.setEnabled(true);
  });

  afterAll(() => {
    globalThis.XMLHttpRequest = original;
  });

  beforeEach(() => {
    networkLogStore.clear();
  });

  it('records a text response as-is', () => {
    runRequest('text', '{"ok":true}');
    expect(networkLogStore.getSnapshot()[0]?.responseBody).toBe('{"ok":true}');
  });

  it('does not throw for a blob responseType, which fetch sets on every request', () => {
    expect(() => runRequest('blob', { size: 11, type: 'application/json' })).not.toThrow();
  });

  it('still records the request when the body is unreadable', () => {
    runRequest('arraybuffer', new ArrayBuffer(24));
    const entry = networkLogStore.getSnapshot()[0];
    expect(entry).toBeDefined();
    expect(entry?.statusCode).toBe(200);
  });

  it('describes a non-text response instead of dropping it', () => {
    runRequest('arraybuffer', new ArrayBuffer(24));
    expect(networkLogStore.getSnapshot()[0]?.responseBody).toBe('[ArrayBuffer 24 bytes]');
  });

  it('serializes a parsed json responseType, which also used to throw', () => {
    runRequest('json', { ok: true });
    expect(networkLogStore.getSnapshot()[0]?.responseBody).toBe('{"ok":true}');
  });
});

describe('patchXHR timing and cancellation', () => {
  const original = globalThis.XMLHttpRequest;

  beforeAll(() => {
    // @ts-expect-error deliberately swapping in a stand-in for the real class
    globalThis.XMLHttpRequest = FakeXHR;
    patchXHR();
    networkLogStore.setEnabled(true);
  });

  afterAll(() => {
    globalThis.XMLHttpRequest = original;
  });

  beforeEach(() => {
    networkLogStore.clear();
  });

  it('records the wait separately from the total', () => {
    runRequest('', '{}');

    const entry = networkLogStore.getSnapshot()[0];
    expect(entry?.ttfb).toBeDefined();
    expect(entry?.duration).toBeGreaterThanOrEqual(entry?.ttfb ?? 0);
  });

  it('marks an aborted request cancelled rather than failed', () => {
    const xhr = new FakeXHR();
    xhr.open();
    xhr.send();
    xhr.abort();

    expect(networkLogStore.getSnapshot()[0]).toMatchObject({
      status: 'error',
      canceled: true,
      error: 'Canceled',
    });
  });

  // An abort reports DONE with status 0 straight after, which reads exactly like a network failure.
  it('keeps the cancelled label when completion follows the abort', () => {
    const xhr = new FakeXHR();
    xhr.status = 0;
    xhr.open();
    xhr.send();
    xhr.abort();
    xhr.finish();

    expect(networkLogStore.getSnapshot()[0]).toMatchObject({ canceled: true, error: 'Canceled' });
  });
});
