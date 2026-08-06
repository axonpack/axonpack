export type ThrottleProfile = {
  /** Simulated download bandwidth, in kilobits per second. */
  downloadKbps: number;
  /** Simulated round-trip latency added before a response is delivered. */
  latencyMs: number;
};

export const THROTTLE_PRESET_IDS = [
  'none',
  'slow-3g',
  'fast-3g',
  'fast-4g',
  'offline',
  'custom',
] as const;

export type ThrottlePresetId = (typeof THROTTLE_PRESET_IDS)[number];

export const THROTTLE_PRESET_LABELS: Record<ThrottlePresetId, string> = {
  none: 'No throttling',
  'slow-3g': 'Slow 3G',
  'fast-3g': 'Fast 3G',
  'fast-4g': 'Fast 4G',
  offline: 'Offline',
  custom: 'Custom',
};

/**
 * Ballpark equivalents of Chrome DevTools' own presets — close enough to reproduce the loading
 * behavior they describe, not claimed to be byte-exact. `none` and `offline` have no profile
 * (nothing to compute), and `custom` resolves from the store's user-entered values instead.
 */
export const THROTTLE_PRESET_PROFILES: Partial<Record<ThrottlePresetId, ThrottleProfile>> = {
  'slow-3g': { downloadKbps: 400, latencyMs: 2000 },
  'fast-3g': { downloadKbps: 1638, latencyMs: 563 },
  'fast-4g': { downloadKbps: 9000, latencyMs: 85 },
};

export const DEFAULT_CUSTOM_THROTTLE: ThrottleProfile = { downloadKbps: 750, latencyMs: 500 };
