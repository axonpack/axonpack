import { createAxonStore } from '../../../core/stores/axon.store';
import { DEFAULT_NETWORK_FILTERS, type NetworkFilters } from '../utils/filter-entries.util';
import type { TimeRange } from '../utils/overview-layout.util';
import { DEFAULT_NETWORK_SORT, type NetworkSort } from '../utils/sort-entries.util';

export type NetworkViewSettings = {
  bigRows: boolean;
  /**
   * Big rows in the React Native DevTools tab, kept apart from the app's. A phone has room for one
   * request per row and wants the detail; a wide table of 21px rows is what Chrome shows by default.
   */
  devtoolsBigRows: boolean;
  /**
   * The DevTools tab's own, for the same reason. The app decides its default from the screen width
   * and keeps it in the view; a desktop has the width to put a value beside its name.
   */
  devtoolsStackedHeaders: boolean;
  groupByFetchClient: boolean;
  showOverview: boolean;
};

export type NetworkViewState = {
  filters: NetworkFilters;
  sort: NetworkSort;
  settings: NetworkViewSettings;
  /** The window picked on the overview. A filter too, so clearing the filters clears it. */
  timeRange: TimeRange | null;
};

/**
 * A store rather than state in the view, because the Network tab has two toolbars: the one in the
 * app and the one in React Native DevTools. A change made in either has to show in both.
 */
const initial: NetworkViewState = {
  filters: DEFAULT_NETWORK_FILTERS,
  sort: DEFAULT_NETWORK_SORT,
  settings: {
    bigRows: true,
    devtoolsBigRows: false,
    devtoolsStackedHeaders: false,
    groupByFetchClient: false,
    showOverview: false,
  },
  timeRange: null,
};

export const networkViewStore = createAxonStore(initial, (set, get) => ({
  patchFilters: (patch: Partial<NetworkFilters>) =>
    set({ filters: { ...get().filters, ...patch } }),
  resetFilters: () => set({ filters: DEFAULT_NETWORK_FILTERS, timeRange: null }),
  setTimeRange: (timeRange: TimeRange | null) => set({ timeRange }),
  setSort: (sort: NetworkSort) => set({ sort }),
  patchSettings: (patch: Partial<NetworkViewSettings>) =>
    set({ settings: { ...get().settings, ...patch } }),
}));

export const useNetworkViewStore = networkViewStore.useStore;

/** The overview's window, but only while the overview it was picked on is showing. */
export function activeTimeRange(state: NetworkViewState): TimeRange | null {
  return state.settings.showOverview ? state.timeRange : null;
}
