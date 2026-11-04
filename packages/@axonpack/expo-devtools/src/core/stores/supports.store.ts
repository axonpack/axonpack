import type { ComponentType, ReactNode } from 'react';

import { createAxonStore } from './axon.store';
import type { AgentTopic } from '../../agent/constants/agent-topics.const';
import type { MaterialIcon } from '../../devtools-remote-tab/constants/material-icons.const';

/**
 * What a support module's `configure()` returns, for the devtools config's `supports`. Each one
 * adds a tab for another package. You get it from `configure()` and never build one yourself.
 *
 * Every support also keeps its data in an AxonStore of its own, fed inside its `Provider` from its
 * package's state, and its entry exports `useSupport()` to read it. The topic and the context read
 * that store, so they show the same state as the tab and the panel.
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
   * The support's topic in the `devtools` command line tool, listed only while the support is in
   * `supports`. Every working support has one. A support with `error` has none, and the tool lists
   * a topic of its `id` that is off, with the error as the reason.
   */
  topic?: AgentTopic;
  /** Names the Console tab's `>` prompt can reach, on top of `console.context`, which wins a clash. */
  context?: Record<string, unknown>;
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
