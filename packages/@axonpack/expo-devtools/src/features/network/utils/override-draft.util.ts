import { formatJson } from '../../../core/utils/format-json.util';
import type { NetworkLogEntry } from '../stores/network-log.store';
import { networkOverridesStore } from '../stores/network-overrides.store';

/** An override while it is being edited, as typed: every field a string until it is saved. */
export type OverrideDraft = { status: string; contentType: string; body: string };

/**
 * Where editing starts: the rule this URL already has, or with none yet, what the server actually
 * answered. Overriding a response then means editing it rather than retyping it.
 */
export function overrideDraftFor(entry: NetworkLogEntry): OverrideDraft {
  const existing = networkOverridesStore.find(entry.url);
  return {
    status: String(existing?.status ?? entry.statusCode ?? 200),
    contentType: existing?.contentType ?? entry.mimeType ?? 'application/json',
    body: existing?.body ?? (entry.responseBody ? formatJson(entry.responseBody) : ''),
  };
}

export function saveOverride(url: string, draft: OverrideDraft): void {
  const parsed = Number(draft.status);
  networkOverridesStore.set({
    url,
    action: 'respond',
    // A status that isn't a number is not a status; 200 is the honest reading of an empty field.
    status: Number.isInteger(parsed) && parsed >= 100 && parsed <= 599 ? parsed : 200,
    contentType: draft.contentType.trim() || 'application/json',
    body: draft.body,
  });
}
