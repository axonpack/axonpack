import { networkLogStore } from '../stores/network-log.store';
import type { ParsedServerSentEvent } from '../utils/parse-event-stream.util';

let counter = 0;

/**
 * Stamps parsed events and writes them to the store. One place mints the ids because two capture
 * paths feed the same list — a counter per path would hand out the same id twice.
 */
export function recordStreamEvents(entryId: string, events: ParsedServerSentEvent[]) {
  for (const event of events) {
    counter += 1;
    networkLogStore.addStreamEvent(entryId, {
      ...event,
      id: `sse-${counter}`,
      timestamp: Date.now(),
    });
  }
}
