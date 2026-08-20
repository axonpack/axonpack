import { networkLogStore } from '../../stores/network-log.store';
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
