import type { StorageAdapterKind } from '../services/define-adapter.service';

const PREVIEW_MAX_LENGTH = 120;
const WHITESPACE_RUN = /\s+/g;

/**
 * A row is one line high, so a pretty-printed JSON blob has to collapse before it gets there —
 * clamping with `numberOfLines` alone would leave a row showing nothing but an opening brace.
 */
export function previewLine(text: string | null): string {
  if (text === null) return '—';
  if (text.length === 0) return '(empty)';

  const collapsed = text.replace(WHITESPACE_RUN, ' ').trim();
  if (collapsed.length <= PREVIEW_MAX_LENGTH) return collapsed;
  return `${collapsed.slice(0, PREVIEW_MAX_LENGTH)}…`;
}

/**
 * UTF-8 bytes, not `text.length`. A store is billed for bytes, and one emoji is four of them
 * against a `.length` of two.
 */
export function utf8ByteLength(text: string | null): number {
  if (text === null) return 0;

  let bytes = 0;
  for (const char of text) {
    const point = char.codePointAt(0) ?? 0;
    if (point < 0x80) bytes += 1;
    else if (point < 0x800) bytes += 2;
    else if (point < 0x10000) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

/** In priority order, not by position — `auth:cache.v1` groups under `auth`, not `auth:cache`. */
const NAMESPACE_DELIMITERS = [':', '/', '.', '_'];

export const UNGROUPED_NAMESPACE = 'Ungrouped';

/**
 * Apps namespace their keys by convention (`auth:token`, `cache/user/1`) and no store knows about
 * it, so the prefix is recovered from the key itself. A key that starts with a delimiter has no
 * prefix to speak of.
 */
export function namespaceOf(key: string): string {
  for (const delimiter of NAMESPACE_DELIMITERS) {
    const at = key.indexOf(delimiter);
    if (at > 0) return key.slice(0, at);
  }
  return UNGROUPED_NAMESPACE;
}

export function describeAdapterKind(kind: StorageAdapterKind): string {
  return kind === 'sync' ? 'Sync' : 'Async';
}

export function formatReadTime(readAt: number | undefined): string {
  if (readAt === undefined) return 'not read yet';
  return new Date(readAt).toLocaleTimeString();
}
