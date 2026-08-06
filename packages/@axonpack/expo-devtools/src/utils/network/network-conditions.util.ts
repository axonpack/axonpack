import {
  THROTTLE_PRESET_LABELS,
  type ThrottleProfile,
} from '../../constants/network/throttle-presets.const';
import { USER_AGENT_PRESET_LABELS } from '../../constants/network/user-agent-presets.const';
import type { ResolvedNetworkConditions } from '../../stores/network/network-conditions.store';

/**
 * How long the request *should* take end to end under the profile: the round-trip latency plus
 * the time the payload needs at the profile's bandwidth. Bytes × 8 gives bits, and dividing bits
 * by kbps lands directly in milliseconds (a kilobit per second is one bit per millisecond).
 */
export function computeThrottleDelayMs(
  byteSize: number | undefined,
  profile: ThrottleProfile
): number {
  const transferMs =
    byteSize && profile.downloadKbps > 0 ? (byteSize * 8) / profile.downloadKbps : 0;
  return Math.round(profile.latencyMs + transferMs);
}

/**
 * How much longer to wait so the request's *total* wall time matches the simulated target,
 * rather than stacking the simulated delay on top of the time the real request already took.
 */
export function remainingDelayMs(targetMs: number, elapsedMs: number): number {
  return Math.max(0, targetMs - elapsedMs);
}

export function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Preset name plus the numbers it resolved to, e.g. `Slow 3G · 400 kbps · 2000 ms latency`. */
export function formatThrottleSummary(conditions: ResolvedNetworkConditions): string {
  const label = THROTTLE_PRESET_LABELS[conditions.throttleId];
  if (!conditions.throttle) return label;
  const { downloadKbps, latencyMs } = conditions.throttle;
  return `${label} · ${downloadKbps} kbps · ${latencyMs} ms latency`;
}

/** Preset name for the override, or `Default` when the request used the platform's own agent. */
export function formatUserAgentSummary(conditions: ResolvedNetworkConditions): string {
  return USER_AGENT_PRESET_LABELS[conditions.userAgentId];
}

/** Replaces any existing casing variant, so an app-set `user-agent` can't shadow the override. */
export function withUserAgentHeader(
  headers: Record<string, string> | undefined,
  userAgent: string
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (key.toLowerCase() !== 'user-agent') result[key] = value;
  }
  result['User-Agent'] = userAgent;
  return result;
}
