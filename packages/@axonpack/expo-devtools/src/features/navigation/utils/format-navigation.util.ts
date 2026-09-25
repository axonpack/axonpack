import type { NavigationMove, NavigationRoute } from '../stores/navigation.store';

/** How long a one-line params preview may run before it is cut. */
const PREVIEW_LENGTH = 120;

/** `GO_BACK` reads as `Go back`; the two rows this package writes itself get plain words. */
export function formatActionLabel(action: string): string {
  if (action === 'INITIAL') return 'Start';
  if (action === 'UNKNOWN') return 'Changed';
  const words = action.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function formatRouteName(route: NavigationRoute | null): string {
  return route?.name ?? '(none)';
}

/** `Home → Details`, or just the destination on the first row. */
export function formatMoveTitle(move: NavigationMove): string {
  const to = formatRouteName(move.to);
  if (!move.from) return to;
  return `${move.from.name} → ${to}`;
}

export function formatParamsPreview(params: object | undefined): string | null {
  if (!params || Object.keys(params).length === 0) return null;
  let text: string;
  try {
    text = JSON.stringify(params) ?? '';
  } catch {
    text = String(params);
  }
  return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH)}…` : text;
}

export function formatClockTime(timestamp: number): string {
  return new Date(timestamp).toTimeString().slice(0, 8);
}

/**
 * How long the screen a move landed on stayed on top: the gap to the next move. Derived here and
 * never stored, since storing it would mean rewriting a row when the next one arrives. `moves` is
 * newest first, so the next move is the one before this index. The newest row is still counting.
 */
export function timeOnScreen(moves: readonly NavigationMove[], index: number): number | null {
  if (index <= 0 || index >= moves.length) return null;
  return moves[index - 1].timestamp - moves[index].timestamp;
}
