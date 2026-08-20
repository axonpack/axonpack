import { THROTTLE_PRESET_LABELS, type ThrottleProfile } from '../constants/throttle-presets.const';
import { USER_AGENT_PRESET_LABELS } from '../constants/user-agent-presets.const';
import type { ResolvedNetworkConditions } from '../stores/network-conditions.store';

export function computeThrottleDelayMs(
  byteSize: number | undefined,
  profile: ThrottleProfile
): number {
  const transferMs =
    byteSize && profile.downloadKbps > 0 ? (byteSize * 8) / profile.downloadKbps : 0;
  return Math.round(profile.latencyMs + transferMs);
}

export function remainingDelayMs(targetMs: number, elapsedMs: number): number {
  return Math.max(0, targetMs - elapsedMs);
}

export function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatThrottleSummary(conditions: ResolvedNetworkConditions): string {
  const label = THROTTLE_PRESET_LABELS[conditions.throttleId];
  if (!conditions.throttle) return label;
  const { downloadKbps, latencyMs } = conditions.throttle;
  return `${label} · ${downloadKbps} kbps · ${latencyMs} ms latency`;
}

export function formatUserAgentSummary(conditions: ResolvedNetworkConditions): string {
  return USER_AGENT_PRESET_LABELS[conditions.userAgentId];
}

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
