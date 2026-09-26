import type { NavigationMove, NavigationState } from '../stores/navigation.store';

/**
 * Every route name the navigator has told us about: the names each mounted navigator declares,
 * and the names the history has visited, since a navigator that was left takes its list with it.
 * A screen inside a navigator that has never mounted is not here; the state has no way to name
 * it until it is.
 */
export function collectRouteNames(
  state: NavigationState | null,
  moves: readonly NavigationMove[]
): string[] {
  const names = new Set<string>();

  function walk(node: NavigationState | undefined) {
    if (!node) return;
    for (const name of node.routeNames ?? []) names.add(name);
    for (const route of node.routes) {
      names.add(route.name);
      walk(route.state);
    }
  }

  walk(state ?? undefined);
  for (const move of moves) if (move.to) names.add(move.to.name);
  return [...names];
}

/** The params a route had the last time it was on top. `moves` is newest first. */
export function lastParamsFor(name: string, moves: readonly NavigationMove[]): object | undefined {
  return moves.find((move) => move.to?.name === name)?.to?.params;
}
