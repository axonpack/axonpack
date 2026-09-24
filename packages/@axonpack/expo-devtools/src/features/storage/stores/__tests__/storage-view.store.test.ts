import { DEFAULT_STORAGE_FILTERS } from '../../utils/filter-entries.util';
import { storageViewStore } from '../storage-view.store';

describe('storageViewStore', () => {
  afterEach(() => storageViewStore.setState(storageViewStore.getInitialState(), true));

  it('merges a filter patch and resets back to the defaults', () => {
    storageViewStore.patchFilters({ search: 'auth' });
    storageViewStore.patchFilters({ invert: true });
    expect(storageViewStore.getState().filters).toEqual({
      ...DEFAULT_STORAGE_FILTERS,
      search: 'auth',
      invert: true,
    });

    storageViewStore.resetFilters();
    expect(storageViewStore.getState().filters).toBe(DEFAULT_STORAGE_FILTERS);
  });

  it('flips the sort direction', () => {
    storageViewStore.toggleDescending();
    expect(storageViewStore.getState().descending).toBe(true);
  });
});
