export type ThrottleProfile = {
  downloadKbps: number;
  /**
   * The uplink, which on a real mobile connection is a fraction of the downlink — the presets below
   * keep that asymmetry rather than pretending a link is symmetrical.
   */
  uploadKbps: number;

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
