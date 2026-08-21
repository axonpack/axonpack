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

describe('patchFetch', () => {
  beforeAll(() => {
    networkLogStore.setEnabled(true);
    // Stubbed before patching, so the wrapper stands in front of this and not the real network.
    globalThis.fetch = (async () => new Response('from the global')) as typeof globalThis.fetch;
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
