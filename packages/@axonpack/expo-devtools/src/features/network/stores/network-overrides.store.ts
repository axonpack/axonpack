import { createAxonStore } from '../../../core/stores/axon.store';

/**
 * What to do with a request instead of letting it through. Keyed by the whole URL rather than a
 * pattern: a rule that matches more than you meant is a request you cannot explain, and the row a
 * rule is created from always knows its exact URL.
 */
export type NetworkOverride = {
  url: string;
  action: 'block' | 'respond';
  /** For `respond` only. Absent means 200. */
  status?: number;
  body?: string;
  contentType?: string;
};

export const networkOverridesStore = createAxonStore(
  { overrides: [] as NetworkOverride[] },
  (setState, get) => ({
    getSnapshot: (): NetworkOverride[] => get().overrides,
    /** The one question the patches ask, on every request, so it stays a plain lookup. */
    find: (url: string): NetworkOverride | undefined =>
      get().overrides.find((override) => override.url === url),
    set: (override: NetworkOverride) =>
      setState({
        overrides: [
          override,
          ...get().overrides.filter((existing) => existing.url !== override.url),
        ],
      }),
    remove: (url: string) =>
      setState({ overrides: get().overrides.filter((override) => override.url !== url) }),
    clear: () => setState({ overrides: [] }),
  })
);

export const useNetworkOverridesStore = networkOverridesStore.useStore;
