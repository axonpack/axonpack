import { EventEmitter } from 'expo';

import {
  DEFAULT_CUSTOM_THROTTLE,
  THROTTLE_PRESET_PROFILES,
  type ThrottlePresetId,
  type ThrottleProfile,
} from '../../constants/network/throttle-presets.const';
import {
  USER_AGENT_PRESET_VALUES,
  type UserAgentPresetId,
} from '../../constants/network/user-agent-presets.const';

/**
 * What the patches actually act on — the selected presets flattened into their effective values.
 * Also stamped onto each log entry, so a request's detail panel reports the conditions that were
 * active when it ran rather than whatever is selected now.
 */
export type ResolvedNetworkConditions = {
  offline: boolean;
  /** `null` when throttling is off. */
  throttle: ThrottleProfile | null;
  /** `null` when no override is active. */
  userAgent: string | null;
  // The selected preset ids come along so the detail panel can name what was active ("Slow 3G")
  // instead of only showing the raw numbers it resolved to.
  throttleId: ThrottlePresetId;
  userAgentId: UserAgentPresetId;
};

type NetworkConditionsEvents = {
  change: () => void;
};

let throttleId: ThrottlePresetId = 'none';
let customThrottle: ThrottleProfile = DEFAULT_CUSTOM_THROTTLE;
let userAgentId: UserAgentPresetId = 'default';
let customUserAgent = '';

const emitter = new EventEmitter<NetworkConditionsEvents>();

function resolveThrottle(): ThrottleProfile | null {
  if (throttleId === 'none' || throttleId === 'offline') return null;
  if (throttleId === 'custom') return customThrottle;
  return THROTTLE_PRESET_PROFILES[throttleId] ?? null;
}

function resolveUserAgent(): string | null {
  if (userAgentId === 'default') return null;
  if (userAgentId === 'custom') return customUserAgent.trim() || null;
  return USER_AGENT_PRESET_VALUES[userAgentId] ?? null;
}

function buildResolved(): ResolvedNetworkConditions {
  return {
    offline: throttleId === 'offline',
    throttle: resolveThrottle(),
    userAgent: resolveUserAgent(),
    throttleId,
    userAgentId,
  };
}

// Rebuilt only when a setter actually changes something, never per request. `resolve()` is read on
// every single fetch/XHR call, and it doubles as the `useSyncExternalStore` snapshot — both of
// which need a stable reference rather than a freshly allocated object each time.
let resolved: ResolvedNetworkConditions = buildResolved();

function commit() {
  resolved = buildResolved();
  emitter.emit('change');
}

export const networkConditionsStore = {
  resolve(): ResolvedNetworkConditions {
    return resolved;
  },
  getThrottleId(): ThrottlePresetId {
    return throttleId;
  },
  getCustomThrottle(): ThrottleProfile {
    return customThrottle;
  },
  getUserAgentId(): UserAgentPresetId {
    return userAgentId;
  },
  getCustomUserAgent(): string {
    return customUserAgent;
  },
  subscribe(listener: () => void) {
    const subscription = emitter.addListener('change', listener);
    return () => subscription.remove();
  },
  setThrottleId(next: ThrottlePresetId) {
    throttleId = next;
    commit();
  },
  setCustomThrottle(next: ThrottleProfile) {
    customThrottle = next;
    commit();
  },
  setUserAgentId(next: UserAgentPresetId) {
    userAgentId = next;
    commit();
  },
  setCustomUserAgent(next: string) {
    customUserAgent = next;
    commit();
  },
};
