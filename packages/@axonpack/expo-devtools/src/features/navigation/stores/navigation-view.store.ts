import { createAxonStore } from '../../../core/stores/axon.store';
import { DEFAULT_SEARCH_MODES, type SearchModes } from '../../../core/utils/text-search.util';

export type NavigationFilters = {
  search: string;
  modes: SearchModes;
};

export type NavigationViewState = {
  filters: NavigationFilters;
  filtersOpen: boolean;
};

/**
 * A store rather than state in the view, because the tab will have two surfaces: the app's panel
 * and the React Native DevTools tab. Which move is open stays each surface's own.
 */
const initial: NavigationViewState = {
  filters: { search: '', modes: DEFAULT_SEARCH_MODES },
  filtersOpen: false,
};

export const navigationViewStore = createAxonStore(initial, (set, get) => ({
  patchFilters: (patch: Partial<NavigationFilters>) =>
    set({ filters: { ...get().filters, ...patch } }),
  setFiltersOpen: (filtersOpen: boolean) => set({ filtersOpen }),
}));

export const useNavigationViewStore = navigationViewStore.useStore;
