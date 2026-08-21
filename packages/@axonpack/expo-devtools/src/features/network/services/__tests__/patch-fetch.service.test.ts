import { networkLogStore } from '../../stores/network-log.store';
import { networkOverridesStore } from '../../stores/network-overrides.store';
import { patchFetch } from '../patch-fetch.service';

type FetchModule = { fetch: typeof globalThis.fetch };

// Virtual, because this package does not depend on Expo's internals — the patch is guarded precisely
// so that a missing module is a no-op rather than a crash.
jest.mock(
  'expo/src/winter/fetch/fetch',
  () => ({ fetch: async () => new Response('from expo fetch') }),
  { virtual: true }
);

const expoFetchModule = jest.requireMock<FetchModule>('expo/src/winter/fetch/fetch');
const rawExpoFetch = expoFetchModule.fetch;

/**
 * What the stubbed network answers with. Indirect because the patch wraps whatever function is on
 * the global at the moment it runs, and it only runs once per process — so a later test cannot swap
 * the global itself without losing the wrapper.
 */
let respond: () => Promise<Response> = async () => new Response('from the global');

describe('patchFetch', () => {
  beforeAll(() => {
    networkLogStore.setEnabled(true);
    // Stubbed before patching, so the wrapper stands in front of this and not the real network.
    globalThis.fetch = (async () => respond()) as typeof globalThis.fetch;
    patchFetch();
  });

  beforeEach(() => networkLogStore.clear());

  it("replaces the export on Expo's fetch module, not only the global", () => {
    expect(expoFetchModule.fetch).not.toBe(rawExpoFetch);
  });

  it('logs a call made through a direct import of that module', async () => {
    await expoFetchModule.fetch('https://example.test/direct-import');

    const entries = networkLogStore.getSnapshot();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      url: 'https://example.test/direct-import',
      source: 'expo/fetch',
      status: 'success',
    });
  });

  // Both wrappers stand in front of the same raw function, so neither may call the other.
  it('logs a call through the global once, under its own source', async () => {
    await globalThis.fetch('https://example.test/global');

    const entries = networkLogStore.getSnapshot();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      url: 'https://example.test/global',
      source: 'fetch',
      status: 'success',
    });
  });
});

describe('patchFetch with a rule in the way', () => {
  const BLOCKED = 'https://example.test/blocked';
  const OVERRIDDEN = 'https://example.test/overridden';

  beforeEach(() => {
    networkLogStore.clear();
    networkOverridesStore.clear();
  });

  afterAll(() => networkOverridesStore.clear());

  it('fails a blocked request the way the platform would, and says who did it', async () => {
    networkOverridesStore.set({ url: BLOCKED, action: 'block' });

    await expect(globalThis.fetch(BLOCKED)).rejects.toThrow(TypeError);

    expect(networkLogStore.getSnapshot()[0]).toMatchObject({
      status: 'error',
      intercepted: 'blocked',
      error: 'Blocked by devtools',
    });
  });

  it('answers an overridden request without reaching the network', async () => {
    networkOverridesStore.set({
      url: OVERRIDDEN,
      action: 'respond',
      status: 503,
      contentType: 'text/plain',
      body: 'nope',
    });

    const response = await globalThis.fetch(OVERRIDDEN);

    expect(response.status).toBe(503);
    expect(await response.text()).toBe('nope');
    expect(networkLogStore.getSnapshot()[0]).toMatchObject({
      status: 'error',
      intercepted: 'overridden',
      statusCode: 503,
      responseBody: 'nope',
      mimeType: 'text/plain',
    });
  });

  it('leaves a request with no rule against it alone', async () => {
    networkOverridesStore.set({ url: BLOCKED, action: 'block' });

    await globalThis.fetch('https://example.test/other');

    expect(networkLogStore.getSnapshot()[0]?.intercepted).toBeUndefined();
  });
});

describe('patchFetch event streams', () => {
  /** A body that stays open, so a test can say when — and whether — the next chunk lands. */
  function openStreamResponse() {
    let push: (chunk: string) => void = () => {};
    let close: () => void = () => {};
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        push = (chunk) => controller.enqueue(new TextEncoder().encode(chunk));
        close = () => controller.close();
      },
    });
    const response = new Response(stream, {
      headers: { 'content-type': 'text/event-stream' },
    });
    return { response, push, close };
  }

  /** The store writes happen off a reader we do not await, so a turn of the loop has to be given. */
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(() => networkLogStore.clear());

  // The reason this path needed its own branch at all: reading the body as text is how every other
  // response is captured, and on a stream that call only returns when the stream ends — which held
  // the app's own `await fetch(...)` open for the entire life of the stream.
  afterAll(() => {
    respond = async () => new Response('from the global');
  });

  it('hands the response back without waiting for the stream to end', async () => {
    const { response } = openStreamResponse();
    respond = async () => response;

    const returned = await globalThis.fetch('https://example.test/stream');

    expect(returned.status).toBe(200);
    expect(networkLogStore.getSnapshot()[0]).toMatchObject({
      eventStream: true,
      status: 'success',
      statusCode: 200,
      mimeType: 'text/event-stream',
    });
  });

  // The decoder is Expo's, not React Native's, so a runtime without Expo's winter globals reaches
  // this. The stream is still a row — it just cannot say what went down it.
  it('says the stream was unreadable where the runtime has no TextDecoder', async () => {
    const decoder = globalThis.TextDecoder;
    const { response, push } = openStreamResponse();
    respond = async () => response;

    // @ts-expect-error standing in for a runtime that never installed it
    delete globalThis.TextDecoder;
    try {
      await globalThis.fetch('https://example.test/stream-no-decoder');
      push('data: one\n\n');
      await settle();
    } finally {
      globalThis.TextDecoder = decoder;
    }

    const entry = networkLogStore.getSnapshot()[0]!;
    expect(entry.eventStream).toBe(true);
    expect(entry.bodyOmitted).toBe('unreadable');
    expect(networkLogStore.getStreamEvents(entry.id)).toHaveLength(0);
  });

  it('records the events as they arrive, and keeps no body of its own', async () => {
    const { response, push, close } = openStreamResponse();
    respond = async () => response;

    await globalThis.fetch('https://example.test/stream-events');
    const id = networkLogStore.getSnapshot()[0]!.id;

    push('event: token\ndata: one\n\n');
    await settle();
    expect(networkLogStore.getStreamEvents(id)).toMatchObject([{ type: 'token', data: 'one' }]);

    push('data: two\n\n');
    close();
    await settle();

    expect(networkLogStore.getStreamEvents(id)).toHaveLength(2);
    expect(networkLogStore.getSnapshot()[0]?.responseBody).toBeUndefined();
  });
});
