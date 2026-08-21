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

/**
 * How long a request body would have taken to go up, which is applied *before* the request leaves.
 *
 * Not the mirror image of the download delay, and the difference is the honest part: a response can be
 * withheld from the app after it arrives, so throttling it is a matter of holding what is already
 * here. Nothing can be withheld on the way out — by the time a patch could act, the bytes are gone.
 * So an upload is modelled by holding the request back before sending it, which is a real wait of the
 * right length in the right place, and no latency is charged here because the download side already
 * charges it once for the round trip.
 */
export function computeUploadDelayMs(
  byteSize: number | undefined,
  profile: ThrottleProfile
): number {
  if (!byteSize || profile.uploadKbps <= 0) return 0;
  return Math.round((byteSize * 8) / profile.uploadKbps);
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
  const { downloadKbps, uploadKbps, latencyMs } = conditions.throttle;
  return `${label} · ${downloadKbps} down · ${uploadKbps} up kbps · ${latencyMs} ms latency`;
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
