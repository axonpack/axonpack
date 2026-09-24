import { createAxonStore } from '../../../core/stores/axon.store';
import {
  DEFAULT_STORAGE_FILTERS,
  type StorageFilters,
  type StorageSortField,
} from '../utils/filter-entries.util';

export type StorageViewState = {
  /** `null` is the first registered store. */
  activeId: string | null;
  filters: StorageFilters;
  sort: StorageSortField;
  descending: boolean;
  groupByNamespace: boolean;
};

/**
 * A store rather than state in the view, because the Storage tab has two surfaces: the panel in the
 * app and the one in React Native DevTools. A filter set in either has to show in both. Which key is
 * open, and which sheet or pane, stays each surface's own business.
 */
const initial: StorageViewState = {
  activeId: null,
  filters: DEFAULT_STORAGE_FILTERS,
  sort: 'key',
  descending: false,
  groupByNamespace: false,
};

export const storageViewStore = createAxonStore(initial, (set, get) => ({
  setActiveId: (activeId: string) => set({ activeId }),
  patchFilters: (patch: Partial<StorageFilters>) =>
    set({ filters: { ...get().filters, ...patch } }),
  resetFilters: () => set({ filters: DEFAULT_STORAGE_FILTERS }),
  setSort: (sort: StorageSortField) => set({ sort }),
  toggleDescending: () => set({ descending: !get().descending }),
  setGroupByNamespace: (groupByNamespace: boolean) => set({ groupByNamespace }),
}));

export const useStorageViewStore = storageViewStore.useStore;
