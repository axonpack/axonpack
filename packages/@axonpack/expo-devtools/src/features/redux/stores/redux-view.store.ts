import { createAxonStore } from '../../../core/stores/axon.store';
import { DEFAULT_SEARCH_MODES, type SearchModes } from '../../../core/utils/text-search.util';

export type ReduxFilters = {
  search: string;
  modes: SearchModes;
};

export type ReduxViewState = {
  filters: ReduxFilters;
  filtersOpen: boolean;
  /** The two accordions. Kept here so leaving the tab keeps them as they were. */
  stateOpen: boolean;
  actionsOpen: boolean;
};

/** A store rather than state in the view, so a second surface would share it. */
const initial: ReduxViewState = {
  filters: { search: '', modes: DEFAULT_SEARCH_MODES },
  filtersOpen: false,
  stateOpen: false,
  actionsOpen: true,
};

export const reduxViewStore = createAxonStore(initial, (set, get) => ({
  patchFilters: (patch: Partial<ReduxFilters>) => set({ filters: { ...get().filters, ...patch } }),
  setFiltersOpen: (filtersOpen: boolean) => set({ filtersOpen }),
  toggleState: () => set({ stateOpen: !get().stateOpen }),
  toggleActions: () => set({ actionsOpen: !get().actionsOpen }),
}));

export const useReduxViewStore = reduxViewStore.useStore;
