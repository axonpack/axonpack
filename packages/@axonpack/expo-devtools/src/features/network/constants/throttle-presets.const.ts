/**
 * A throttling profile — the shape behind each preset in the Network tab's conditions panel, and
 * what `devtools.networkConditionsStore` reports as the active one.
 *
 * Setting one delays a response by `latencyMs` and then paces its body at the given rates, so a
 * request behaves roughly the way it would on that connection.
 */
export type ThrottleProfile = {
  /** Downlink in kilobits per second. */
  downloadKbps: number;
  /**
   * The uplink, which on a real mobile connection is a fraction of the downlink — the presets below
   * keep that asymmetry rather than pretending a link is symmetrical.
   */
  uploadKbps: number;

  /** Round-trip delay added before a response starts, in milliseconds. */
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

/**
 * The throttling choices in the Network tab's conditions panel: `'none'` (the default, no
 * throttling), `'slow-3g'`, `'fast-3g'`, `'fast-4g'`, `'offline'` (requests fail as they would
 * without a network), and `'custom'` for rates you set yourself.
 */
export type ThrottlePresetId = (typeof THROTTLE_PRESET_IDS)[number];

export const THROTTLE_PRESET_LABELS: Record<ThrottlePresetId, string> = {
  none: 'No throttling',
  'slow-3g': 'Slow 3G',
  'fast-3g': 'Fast 3G',
  'fast-4g': 'Fast 4G',
  offline: 'Offline',
  custom: 'Custom',
};

export const THROTTLE_PRESET_PROFILES: Partial<Record<ThrottlePresetId, ThrottleProfile>> = {
  'slow-3g': { downloadKbps: 400, uploadKbps: 400, latencyMs: 2000 },
  'fast-3g': { downloadKbps: 1638, uploadKbps: 768, latencyMs: 563 },
  'fast-4g': { downloadKbps: 9000, uploadKbps: 3000, latencyMs: 85 },
};

export const DEFAULT_CUSTOM_THROTTLE: ThrottleProfile = {
  downloadKbps: 750,
  uploadKbps: 375,
  latencyMs: 500,
};
