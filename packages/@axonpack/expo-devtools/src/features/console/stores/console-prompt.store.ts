import { createAxonStore } from '../../../core/stores/axon.store';

export const consolePromptStore = createAxonStore({ draft: '', focusRequest: 0 }, (set, get) => ({
  getDraft: (): string => get().draft,
  getFocusRequest: (): number => get().focusRequest,
  setDraft: (draft: string) => set({ draft }),
  recall: (source: string) => set({ draft: source, focusRequest: get().focusRequest + 1 }),
}));

export const useConsolePromptStore = consolePromptStore.useStore;
