import { createAxonStore } from '../../../core/stores/axon.store';
import { DEFAULT_NETWORK_FILTERS, type NetworkFilters } from '../utils/filter-entries.util';
import { DEFAULT_NETWORK_SORT, type NetworkSort } from '../utils/sort-entries.util';

export type NetworkViewSettings = {
  bigRows: boolean;
  groupByFetchClient: boolean;
  showOverview: boolean;
};

export type NetworkViewState = {
  filters: NetworkFilters;
  sort: NetworkSort;
  settings: NetworkViewSettings;
};

/**
 * A store rather than state in the view, because the Network tab has two toolbars: the one in the
 * app and the one in React Native DevTools. A change made in either has to show in both.
 */
const initial: NetworkViewState = {
  filters: DEFAULT_NETWORK_FILTERS,
  sort: DEFAULT_NETWORK_SORT,
  settings: { bigRows: true, groupByFetchClient: false, showOverview: false },
};

export const networkViewStore = createAxonStore(initial, (set, get) => ({
  patchFilters: (patch: Partial<NetworkFilters>) =>
    set({ filters: { ...get().filters, ...patch } }),
  resetFilters: () => set({ filters: DEFAULT_NETWORK_FILTERS }),
  setSort: (sort: NetworkSort) => set({ sort }),
  patchSettings: (patch: Partial<NetworkViewSettings>) =>
    set({ settings: { ...get().settings, ...patch } }),
}));

export const useNetworkViewStore = networkViewStore.useStore;
