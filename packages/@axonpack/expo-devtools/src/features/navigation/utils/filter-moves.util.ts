import { testMatch, type Matcher } from '../../../core/utils/text-search.util';
import type { NavigationMove } from '../stores/navigation.store';

function json(value: unknown): string {
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return '';
  }
}

/** Everything a search runs over: the action, both route names, the path, the params, the container. */
export function moveSearchText(move: NavigationMove): string {
  return [
    move.action,
    move.container,
    move.from?.name,
    move.to?.name,
    move.to?.path,
    json(move.to?.params),
    json(move.payload),
  ]
    .filter((part) => part)
    .join(' ');
}

export function filterMoves(
  moves: NavigationMove[],
  matcher: Matcher | null,
  container: string | null = null
): NavigationMove[] {
  return moves.filter(
    (move) =>
      (container === null || move.container === container) &&
      testMatch(moveSearchText(move), matcher)
  );
}

/** The containers the history has rows for, in first-seen order. */
export function listContainers(moves: readonly NavigationMove[]): string[] {
  const names: string[] = [];
  for (const move of moves) if (!names.includes(move.container)) names.push(move.container);
  return names;
}
