import { createAxonStore } from './axon.store';

/**
 * Whether the panel is open.
 *
 * A store rather than state inside the overlay because the launcher button is optional: an app that
 * hides it opens the panel from its own UI through `useDevtoolsPanel`, and that call site is
 * nowhere near the component holding the modal.
 */
export const panelVisibilityStore = createAxonStore({ open: false }, (set, get) => {
  const setOpen = (open: boolean) => {
    if (get().open !== open) set({ open });
  };
  return {
    isOpen: (): boolean => get().open,
    show: () => setOpen(true),
    hide: () => setOpen(false),
    toggle: () => setOpen(!get().open),
  };
});

export const usePanelVisibilityStore = panelVisibilityStore.useStore;
