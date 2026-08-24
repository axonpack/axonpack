import { networkLogStore } from '../stores/network-log.store';
import type { ParsedServerSentEvent } from '../utils/parse-event-stream.util';

let counter = 0;
/**
 * Streams are a kind of traffic, not a transport: one arrives on a `fetch`, on an `XMLHttpRequest` or
 * inside a page, and the switch that silences it has to be the same switch in all three places. So it
 * lives beside the funnel every event already passes through rather than in any one patch.
 */
let capturing = true;

export function setStreamCapture(enabled: boolean) {
  capturing = enabled;
}

export function isStreamCaptureEnabled(): boolean {
  return capturing;
}

/**
 * Stamps parsed events and writes them to the store. One place mints the ids because two capture
 * paths feed the same list — a counter per path would hand out the same id twice.
 */
export function recordStreamEvents(entryId: string, events: ParsedServerSentEvent[]) {
  // The backstop, so a path that forgets to ask records nothing rather than half a stream.
  if (!capturing) return;
  for (const event of events) {
    counter += 1;
    networkLogStore.addStreamEvent(entryId, {
      ...event,
      id: `sse-${counter}`,
      timestamp: Date.now(),
    });
  }
}
