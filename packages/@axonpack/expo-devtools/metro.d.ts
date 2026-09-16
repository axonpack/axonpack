import type { MetroConfig } from 'metro-config';

export type WithDevtoolsOptions = {
  /**
   * Where React Native DevTools' own files are, for a layout this cannot work out for itself. A
   * monorepo that hoists oddly is the case that needs it.
   */
  frontendPath?: string;
};

/** Serves the Axonpack tab from the dev server. */
export declare function withDevtools<TConfig extends MetroConfig>(
  config: TConfig,
  options?: WithDevtoolsOptions
): TConfig;
