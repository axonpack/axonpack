import { createAxonStore } from '../../../core/stores/axon.store';
import { DEFAULT_SEARCH_MODES, type SearchModes } from '../../../core/utils/text-search.util';

export type NavigationFilters = {
  search: string;
  modes: SearchModes;
  /** One container's moves only, or every container's with `null`. */
  container: string | null;
};

export type NavigationViewState = {
  filters: NavigationFilters;
  filtersOpen: boolean;
  /**
   * The container the navigator card shows and its buttons act on, as picked in its dropdown.
   * `null` until something is picked, and then the card follows whichever container moved last.
   */
  selectedContainer: string | null;
  /** The History accordion. Kept here so leaving the tab keeps it as it was. */
  historyOpen: boolean;
};

/**
 * A store rather than state in the view, because the tab will have two surfaces: the app's panel
 * and the React Native DevTools tab. Which move is open stays each surface's own.
 */
const initial: NavigationViewState = {
  filters: { search: '', modes: DEFAULT_SEARCH_MODES, container: null },
  filtersOpen: false,
  selectedContainer: null,
  historyOpen: true,
};

export const navigationViewStore = createAxonStore(initial, (set, get) => ({
  patchFilters: (patch: Partial<NavigationFilters>) =>
    set({ filters: { ...get().filters, ...patch } }),
  setFiltersOpen: (filtersOpen: boolean) => set({ filtersOpen }),
  selectContainer: (selectedContainer: string | null) => set({ selectedContainer }),
  toggleHistory: () => set({ historyOpen: !get().historyOpen }),
}));

export const useNavigationViewStore = navigationViewStore.useStore;
