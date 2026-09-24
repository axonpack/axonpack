import { createAxonStore } from '../../../core/stores/axon.store';
import {
  DEFAULT_CRASH_FILTERS,
  toggleKind,
  type CrashFilters,
} from '../utils/filter-crash-records.util';
import type { CrashKind } from './crash.store';

export type CrashViewState = {
  filters: CrashFilters;
  filtersOpen: boolean;
};

/**
 * A store rather than state in the view, because the Crashes tab has two surfaces: the app's panel
 * and the React Native DevTools tab. Which report is open is not in here on purpose: that stays each
 * surface's own, as a selected request does in Network.
 */
const initial: CrashViewState = { filters: DEFAULT_CRASH_FILTERS, filtersOpen: false };

export const crashViewStore = createAxonStore(initial, (set, get) => ({
  patchFilters: (patch: Partial<CrashFilters>) => set({ filters: { ...get().filters, ...patch } }),
  toggleKind: (kind: CrashKind) =>
    set({ filters: { ...get().filters, kinds: toggleKind(get().filters.kinds, kind) } }),
  setFiltersOpen: (filtersOpen: boolean) => set({ filtersOpen }),
}));

export const useCrashViewStore = crashViewStore.useStore;
