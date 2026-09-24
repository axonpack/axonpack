import { createAxonStore } from '../../../core/stores/axon.store';
import {
  DEFAULT_CUSTOM_THROTTLE,
  THROTTLE_PRESET_PROFILES,
  type ThrottlePresetId,
  type ThrottleProfile,
} from '../constants/throttle-presets.const';
import {
  USER_AGENT_PRESET_VALUES,
  type UserAgentPresetId,
} from '../constants/user-agent-presets.const';

/**
 * The network conditions in force right now, as returned by
 * `devtools.networkConditionsStore.resolve()` — the preset ids the user picked, plus the concrete
 * values those ids resolve to.
 */
export type ResolvedNetworkConditions = {
  /** `true` while the offline preset is selected, which is what fails outgoing requests. */
  offline: boolean;
  /** The active throttling rates, or `null` when nothing is being throttled. */
  throttle: ThrottleProfile | null;
  /** The user-agent string to send, or `null` to leave the platform's own alone. */
  userAgent: string | null;
  /** Which throttling preset is selected. Defaults to `'none'`. */
  throttleId: ThrottlePresetId;
  /** Which user-agent preset is selected. Defaults to `'default'`. */
  userAgentId: UserAgentPresetId;
};

type ConditionsChoice = {
  throttleId: ThrottlePresetId;
  customThrottle: ThrottleProfile;
  userAgentId: UserAgentPresetId;
  customUserAgent: string;
};

type NetworkConditionsState = ConditionsChoice & {
  /** Kept in the state, not derived per read, so every request between changes shares one object. */
  resolved: ResolvedNetworkConditions;
};

function resolveThrottle({ throttleId, customThrottle }: ConditionsChoice): ThrottleProfile | null {
  if (throttleId === 'none' || throttleId === 'offline') return null;
  if (throttleId === 'custom') return customThrottle;
  return THROTTLE_PRESET_PROFILES[throttleId] ?? null;
}

function resolveUserAgent({ userAgentId, customUserAgent }: ConditionsChoice): string | null {
  if (userAgentId === 'default') return null;
  if (userAgentId === 'custom') return customUserAgent.trim() || null;
  return USER_AGENT_PRESET_VALUES[userAgentId] ?? null;
}

function withResolved(choice: ConditionsChoice): NetworkConditionsState {
  return {
    ...choice,
    resolved: {
      offline: choice.throttleId === 'offline',
      throttle: resolveThrottle(choice),
      userAgent: resolveUserAgent(choice),
      throttleId: choice.throttleId,
      userAgentId: choice.userAgentId,
    },
  };
}

export const networkConditionsStore = createAxonStore(
  withResolved({
    throttleId: 'none',
    customThrottle: DEFAULT_CUSTOM_THROTTLE,
    userAgentId: 'default',
    customUserAgent: '',
  }),
  (set, get) => {
    const choose = (patch: Partial<ConditionsChoice>) =>
      set(withResolved({ ...get(), ...patch }), true);
    return {
      resolve: (): ResolvedNetworkConditions => get().resolved,
      getThrottleId: (): ThrottlePresetId => get().throttleId,
      getCustomThrottle: (): ThrottleProfile => get().customThrottle,
      getUserAgentId: (): UserAgentPresetId => get().userAgentId,
      getCustomUserAgent: (): string => get().customUserAgent,
      setThrottleId: (throttleId: ThrottlePresetId) => choose({ throttleId }),
      setCustomThrottle: (customThrottle: ThrottleProfile) => choose({ customThrottle }),
      setUserAgentId: (userAgentId: UserAgentPresetId) => choose({ userAgentId }),
      setCustomUserAgent: (customUserAgent: string) => choose({ customUserAgent }),
    };
  }
);

export const useNetworkConditionsStore = networkConditionsStore.useStore;
