import { EventEmitter } from 'expo';

/**
 * What to do with a request instead of letting it through. Keyed by the whole URL rather than a
 * pattern: a rule that matches more than you meant is a request you cannot explain, and the row a
 * rule is created from always knows its exact URL.
 */
export type NetworkOverride = {
  url: string;
  action: 'block' | 'respond';
  /** For `respond` only. Absent means 200. */
  status?: number;
  body?: string;
  contentType?: string;
};

type OverrideEvents = {
  change: () => void;
};

let overrides: NetworkOverride[] = [];
const emitter = new EventEmitter<OverrideEvents>();

export const networkOverridesStore = {
  getSnapshot(): NetworkOverride[] {
    return overrides;
  },
  subscribe(listener: () => void) {
    const subscription = emitter.addListener('change', listener);
    return () => subscription.remove();
  },
  /** The one question the patches ask, on every request, so it stays a plain lookup. */
  find(url: string): NetworkOverride | undefined {
    return overrides.find((override) => override.url === url);
  },
  set(override: NetworkOverride) {
    overrides = [override, ...overrides.filter((existing) => existing.url !== override.url)];
    emitter.emit('change');
  },
  remove(url: string) {
    overrides = overrides.filter((override) => override.url !== url);
    emitter.emit('change');
  },
  clear() {
    overrides = [];
    emitter.emit('change');
  },
};
