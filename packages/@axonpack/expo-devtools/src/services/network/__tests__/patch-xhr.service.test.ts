import { networkLogStore } from '../../../stores/network/network-log.store';
import { patchXHR } from '../patch-xhr.service';

class FakeXHR {
  static readonly DONE = 4;
  readyState = FakeXHR.DONE;
  status = 200;
  statusText = 'OK';
  responseType = '';
  response: unknown = '';

  #listeners: (() => void)[] = [];

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
  addEventListener(_type: string, listener: () => void) {
    this.#listeners.push(listener);
  }
  abort() {}

  finish() {
    for (const listener of this.#listeners) listener.call(this);
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
