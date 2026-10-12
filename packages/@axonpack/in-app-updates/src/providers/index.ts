import type { Provider } from "../types";

export { appStore, appStoreUrl } from "./app-store";
export { playStore, playStoreUrl, parsePlayStorePage } from "./play-store";
export { jsonProvider, defaultParse } from "./json";
export type { JsonProviderOptions } from "./json";

/** Tries each provider in order and returns the first success. Throws the last error. */
export const chain = (...providers: Provider[]): Provider => ({
  async getVersion(context) {
    let last: unknown;
    for (const provider of providers) {
      try {
        return await provider.getVersion(context);
      } catch (error) {
        if (context.signal?.aborted) throw error;
        last = error;
      }
    }
    throw last;
  },
});
