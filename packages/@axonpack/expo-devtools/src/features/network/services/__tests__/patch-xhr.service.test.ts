import { networkLogStore } from '../../stores/network-log.store';
import { networkOverridesStore } from '../../stores/network-overrides.store';
import { patchXHR } from '../patch-xhr.service';

type ProgressLike = { loaded: number; total: number; lengthComputable: boolean };

class FakeUploadTarget {
  #listeners: ((event: ProgressLike) => void)[] = [];

  addEventListener(_type: string, listener: (event: ProgressLike) => void) {
    this.#listeners.push(listener);
  }

  emitProgress(event: ProgressLike) {
    for (const listener of this.#listeners) listener(event);
  }
}

class FakeXHR {
  static readonly HEADERS_RECEIVED = 2;
  static readonly LOADING = 3;
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
  /** Settable, so a test can describe a response that declared no type at all. */
  headers = 'content-type: application/json';

  getAllResponseHeaders() {
    return this.headers;
  }
  getResponseHeader(name: string) {
    const prefix = `${name.toLowerCase()}:`;
    const line = this.headers
      .split(/[\r\n]+/)
      .find((entry) => entry.trim().toLowerCase().startsWith(prefix));
    return line === undefined ? null : line.slice(line.indexOf(':') + 1).trim();
  }
  /** Its own event target, exactly as the DOM has it — upload progress is reported nowhere else. */
  readonly upload = new FakeUploadTarget();

  addEventListener(type: string, listener: (event?: unknown) => void) {
    (this.#listeners[type] ??= []).push(listener as () => void);
  }

  emitProgress(type: string, event: ProgressLike) {
    for (const listener of this.#listeners[type] ?? []) {
      (listener as unknown as (e: ProgressLike) => void).call(this, event);
    }
  }
  abort() {
    this.emit('abort');
  }

  emit(type: string) {
    for (const listener of this.#listeners[type] ?? []) listener.call(this);
  }

  /** Appends to the body and reports it the way React Native reports an incremental read. */
  streamChunk(chunk: string) {
    this.response = `${this.response as string}${chunk}`;
    this.readyState = FakeXHR.LOADING;
    this.emit('readystatechange');
  }

  /** Headers first, then completion — the order a real request reports them in. */
  finish() {
    this.readyState = FakeXHR.HEADERS_RECEIVED;
    this.emit('readystatechange');
    this.readyState = FakeXHR.DONE;
    this.emit('readystatechange');
  }
}

function runRequest(responseType: string, response: unknown, headers?: string) {
  const xhr = new FakeXHR();
  xhr.responseType = responseType;
  xhr.response = response;
  if (headers !== undefined) xhr.headers = headers;
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

  // It used to record the string `[ArrayBuffer 24 bytes]` — enough to know a body came back, not
  // enough to see what it was.
  it('keeps the bytes of a non-text response', () => {
    runRequest('arraybuffer', new ArrayBuffer(24));

    const entry = networkLogStore.getSnapshot()[0];
    expect(entry?.responseBody).toBeUndefined();
    expect(entry?.responseBase64).toBe('A'.repeat(32));
    expect(entry?.size).toBe(24);
  });

  it('says so rather than keeping the bytes of a body past the cap', () => {
    runRequest('arraybuffer', new ArrayBuffer(600 * 1024));

    const entry = networkLogStore.getSnapshot()[0];
    expect(entry?.bodyOmitted).toBe('too-large');
    expect(entry?.responseBase64).toBeUndefined();
    expect(entry?.size).toBe(600 * 1024);
  });

  it('works out the type of a body no header described', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    runRequest('arraybuffer', png.buffer, '');

    expect(networkLogStore.getSnapshot()[0]?.mimeType).toBe('image/png');
  });

  // The other half of the same rule: what the server said is never second-guessed.
  it('prefers a declared type over what the bytes look like', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    runRequest('arraybuffer', png.buffer, 'content-type: application/octet-stream');

    expect(networkLogStore.getSnapshot()[0]?.mimeType).toBe('application/octet-stream');
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

describe('patchXHR progress', () => {
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

  it('reports a download as a fraction of a declared length', () => {
    const xhr = new FakeXHR();
    xhr.open();
    xhr.send();
    xhr.emitProgress('progress', { loaded: 512, total: 2048, lengthComputable: true });

    expect(networkLogStore.getSnapshot()[0]?.progress).toEqual({
      direction: 'download',
      loaded: 512,
      total: 2048,
    });
  });

  // Nothing declared a length, so there is no percentage to show — only how far it has got.
  it('leaves the total out when the length is not computable', () => {
    const xhr = new FakeXHR();
    xhr.open();
    xhr.send();
    xhr.emitProgress('progress', { loaded: 300, total: 0, lengthComputable: false });

    expect(networkLogStore.getSnapshot()[0]?.progress).toEqual({
      direction: 'download',
      loaded: 300,
      total: undefined,
    });
  });

  it('reports the request body going up, from the upload target', () => {
    const xhr = new FakeXHR();
    xhr.open();
    xhr.send();
    xhr.upload.emitProgress({ loaded: 64, total: 64, lengthComputable: true });

    expect(networkLogStore.getSnapshot()[0]?.progress).toMatchObject({
      direction: 'upload',
      loaded: 64,
    });
  });
});

describe('patchXHR with a rule in the way', () => {
  const original = globalThis.XMLHttpRequest;
  const URL = 'https://example.test/ruled';

  beforeAll(() => {
    // @ts-expect-error deliberately swapping in a stand-in for the real class
    globalThis.XMLHttpRequest = FakeXHR;
    patchXHR();
    networkLogStore.setEnabled(true);
  });

  afterAll(() => {
    globalThis.XMLHttpRequest = original;
    networkOverridesStore.clear();
  });

  beforeEach(() => {
    networkLogStore.clear();
    networkOverridesStore.clear();
  });

  function open(url = URL) {
    const xhr = new FakeXHR();
    xhr.open('GET', url);
    return xhr;
  }

  it('never sends a blocked request, and records it as blocked rather than cancelled', () => {
    networkOverridesStore.set({ url: URL, action: 'block' });
    const xhr = open();
    xhr.send();

    expect(networkLogStore.getSnapshot()[0]).toMatchObject({
      status: 'error',
      intercepted: 'blocked',
      error: 'Blocked by devtools',
    });
    expect(networkLogStore.getSnapshot()[0]?.canceled).toBeUndefined();
  });

  it('answers the app from the rule, over the real response', () => {
    networkOverridesStore.set({ url: URL, action: 'respond', status: 503, body: 'nope' });
    const xhr = open();
    xhr.response = 'the real body';
    xhr.status = 200;
    xhr.send();

    expect(xhr.status).toBe(503);
    expect(xhr.responseText).toBe('nope');
    expect(networkLogStore.getSnapshot()[0]?.intercepted).toBe('overridden');
  });

  // An app that asked for `json` expects an object, so handing it the string would break the code
  // the override exists to exercise.
  it('parses the body for a responseType of json', () => {
    networkOverridesStore.set({ url: URL, action: 'respond', body: '{"ok":false}' });
    const xhr = open();
    xhr.responseType = 'json';
    xhr.send();

    expect(xhr.response).toEqual({ ok: false });
  });

  it('hands back the string when the body is not valid json', () => {
    networkOverridesStore.set({ url: URL, action: 'respond', body: 'not json' });
    const xhr = open();
    xhr.responseType = 'json';
    xhr.send();

    expect(xhr.response).toBe('not json');
  });

  it('leaves a URL with no rule against it alone', () => {
    networkOverridesStore.set({ url: URL, action: 'block' });
    const xhr = open('https://example.test/other');
    xhr.send();
    xhr.finish();

    expect(networkLogStore.getSnapshot()[0]?.intercepted).toBeUndefined();
  });
});

describe('patchXHR event streams', () => {
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

  /** Opened and answered, with the headers in but the body still arriving. */
  function openStream() {
    const xhr = new FakeXHR();
    xhr.headers = 'content-type: text/event-stream';
    xhr.open();
    xhr.send();
    xhr.readyState = FakeXHR.HEADERS_RECEIVED;
    xhr.emit('readystatechange');
    return xhr;
  }

  function firstEntry() {
    return networkLogStore.getSnapshot()[0];
  }

  it('marks the row a stream as soon as the headers say so', () => {
    openStream();

    const entry = firstEntry();
    expect(entry?.eventStream).toBe(true);
    // Nothing about a stream's response waits for its end, because its end may be the session's.
    expect(entry).toMatchObject({ statusCode: 200, mimeType: 'text/event-stream' });
  });

  it('records each event as its chunk arrives', () => {
    const xhr = openStream();

    xhr.streamChunk('event: token\ndata: one\n\n');
    expect(networkLogStore.getStreamEvents(firstEntry()!.id)).toMatchObject([
      { type: 'token', data: 'one' },
    ]);

    xhr.streamChunk('data: two\n\n');
    expect(networkLogStore.getStreamEvents(firstEntry()!.id)).toHaveLength(2);
  });

  // The chunk boundary is the network's business, not the app's, so a block split across two reads
  // has to come out as the one event it is.
  it('reads an event split across two chunks as one event', () => {
    const xhr = openStream();

    xhr.streamChunk('data: half');
    xhr.streamChunk(' and half\n\n');

    expect(networkLogStore.getStreamEvents(firstEntry()!.id)).toMatchObject([
      { type: 'message', data: 'half and half' },
    ]);
  });

  it('keeps no raw body for a stream, since its events are the body', () => {
    const xhr = openStream();
    xhr.streamChunk('data: one\n\n');
    xhr.readyState = FakeXHR.DONE;
    xhr.emit('readystatechange');

    const entry = firstEntry();
    expect(entry?.responseBody).toBeUndefined();
    expect(entry?.status).toBe('success');
  });

  // `close()` on a stream aborts the request underneath it, which every other row would call a
  // cancellation.
  it('treats a closed stream as one that ended, not one that was cancelled', () => {
    const xhr = openStream();
    xhr.streamChunk('data: one\n\n');
    xhr.abort();

    const entry = firstEntry();
    expect(entry?.status).toBe('success');
    expect(entry?.canceled).toBeUndefined();
    expect(networkLogStore.getStreamEvents(entry!.id)).toHaveLength(1);
  });

  it('leaves an ordinary response alone', () => {
    runRequest('text', '{"ok":true}');

    const entry = firstEntry();
    expect(entry?.eventStream).toBeUndefined();
    expect(entry?.responseBody).toBe('{"ok":true}');
  });
});
