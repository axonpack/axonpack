import type { ComponentType, ReactNode } from 'react';

import { createAxonStore } from './axon.store';
import type { MaterialIcon } from '../../devtools-remote-tab/constants/material-icons.const';

/**
 * What a support module's `configure()` returns, for the devtools config's `supports`. Each one
 * adds a tab for another package. You get it from `configure()` and never build one yourself.
 */
export type DevtoolsSupport = {
  /**
   * The tab's key, the same for every version of a support. With two supports of one id in the
   * config, the first is used and the start logs the other with `console.error`.
   */
  id: string;
  /** The tab's name, in the in-app panel and in React Native DevTools. */
  title: string;
  icon: MaterialIcon;
  /**
   * Goes around the app, with the devtools on or off. The tab is inside it, and the DevTools panel
   * gets one of its own.
   */
  Provider?: ComponentType<{ children?: ReactNode }>;
  /** The tab in the in-app panel. */
  Tab?: ComponentType;
  /** The panel in React Native DevTools' Axonpack tab. */
  Panel?: ComponentType;
  /**
   * Why the support can't run, such as a package that isn't installed. The start logs it with
   * `console.error`, and the tab and the panel show it instead of `Tab` and `Panel`.
   */
  error?: string;
};

/** The config's `supports`, set once by the start and never changed after. */
export const supportsStore = createAxonStore({ supports: [] as DevtoolsSupport[] }, (set, get) => ({
  setSupports: (supports: DevtoolsSupport[]) => set({ supports }),
  getSupports: () => get().supports,
}));

export const useSupportsStore = supportsStore.useStore;
