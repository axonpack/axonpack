import type { PreviewConfig } from '@axonpack/preview';

import { createAxonStore } from '../../../core/stores/axon.store';

/** `@axonpack/preview` as loaded. A type only: this package never imports it. */
export type PreviewModule = typeof import('@axonpack/preview');

/**
 * The preview package and the config the app passed as `config.preview`, set once by the start.
 * Both stay null when the app passed none or the package isn't installed, which keeps the Preview
 * tab out of the panel.
 */
export const previewStore = createAxonStore(
  { module: null as PreviewModule | null, config: null as PreviewConfig | null },
  (set, get) => ({
    setUp: (module: PreviewModule, config: PreviewConfig) => set({ module, config }),
    getModule: () => get().module,
    getConfig: () => get().config,
    isSetUp: () => get().module !== null,
  })
);

export const usePreviewStore = previewStore.useStore;
