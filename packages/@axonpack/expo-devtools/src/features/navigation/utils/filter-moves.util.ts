import { testMatch, type Matcher } from '../../../core/utils/text-search.util';
import type { NavigationMove } from '../stores/navigation.store';

function json(value: unknown): string {
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return '';
  }
}

/** Everything a search runs over: the action, both route names, the path and the params. */
export function moveSearchText(move: NavigationMove): string {
  return [
    move.action,
    move.from?.name,
    move.to?.name,
    move.to?.path,
    json(move.to?.params),
    json(move.payload),
  ]
    .filter((part) => part)
    .join(' ');
}

export function filterMoves(moves: NavigationMove[], matcher: Matcher | null): NavigationMove[] {
  if (!matcher?.pattern) return moves;
  return moves.filter((move) => testMatch(moveSearchText(move), matcher));
}
