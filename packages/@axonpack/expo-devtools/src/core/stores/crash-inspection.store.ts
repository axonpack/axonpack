import { createAxonStore } from './axon.store';

/**
 * Which crash report the panel is showing over whatever tab is open — currently asked for by a
 * console error row that is linked to the crash it caused.
 *
 * A store rather than a prop because the two ends never meet: the Console tab asks, the Crashes tab
 * answers, and the panel shell is what mounts the sheet. Opening a report this way deliberately does
 * *not* switch tabs — the point is to read it without losing the console's filters and scroll.
 */
export const crashInspectionStore = createAxonStore(
  { inspectedId: null as string | null },
  (set, get) => ({
    getSnapshot: (): string | null => get().inspectedId,
    open: (id: string) => set({ inspectedId: id }),
    close: () => set({ inspectedId: null }),
  })
);

export const useCrashInspectionStore = crashInspectionStore.useStore;
