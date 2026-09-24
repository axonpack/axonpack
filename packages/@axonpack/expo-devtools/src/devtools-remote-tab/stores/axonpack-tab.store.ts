import { createAxonStore } from '../../core/stores/axon.store';

/**
 * Which panel the DevTools tab shows, and a report one panel asked another to open. A store rather
 * than state in `AxonpackTab`, because the ask comes from inside a panel: a crash in the Console
 * opens its report in Crashes. Only the active panel is mounted, so the ask has to outlive the one
 * that made it.
 *
 * The DevTools tab's own, never the phone's: `crashInspectionStore` would put a sheet up on the
 * phone's screen.
 */
export const axonpackTabStore = createAxonStore(
  { activeId: 'network', requestedCrashId: null as string | null },
  (set) => ({
    select: (activeId: string) => set({ activeId }),
    openCrash: (id: string) => set({ activeId: 'crashes', requestedCrashId: id }),
    clearRequestedCrash: () => set({ requestedCrashId: null }),
  })
);

export const useAxonpackTabStore = axonpackTabStore.useStore;
