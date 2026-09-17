import type { MetroConfig } from 'metro-config';

/** Serves the Axonpack panel from the dev server. */
export declare function withDevtools<TConfig extends MetroConfig>(config: TConfig): TConfig;
