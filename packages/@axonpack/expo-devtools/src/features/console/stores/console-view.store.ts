import { createAxonStore } from '../../../core/stores/axon.store';
import { DEFAULT_CONSOLE_FILTERS, type ConsoleFilters } from '../utils/filter-console-entries.util';

/**
 * A store rather than state in the view, because the Console has two surfaces: the app's panel and
 * the React Native DevTools tab. A filter set on either has to show on both, and the tab drops its
 * own state every time another panel is picked.
 */
export type ConsoleViewState = {
  filters: ConsoleFilters;
  filtersOpen: boolean;
};

const initial: ConsoleViewState = { filters: DEFAULT_CONSOLE_FILTERS, filtersOpen: false };

export const consoleViewStore = createAxonStore(initial, (set, get) => ({
  patchFilters: (patch: Partial<ConsoleFilters>) =>
    set({ filters: { ...get().filters, ...patch } }),
  setFiltersOpen: (filtersOpen: boolean) => set({ filtersOpen }),
}));

export const useConsoleViewStore = consoleViewStore.useStore;
