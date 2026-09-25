import type { NavigationContainerInfo, NavigationState } from '../stores/navigation.store';

export type OutlineRow = {
  key: string;
  /** How far in the row sits: which column its rail or caption starts in. */
  depth: number;
  kind: 'route' | 'container';
  label: string;
  params?: object;
  /** The route its navigator has in front: inside a stack that is the top, in tabs the chosen one. */
  active: boolean;
  /** The one route the person sees: the active route of the deepest active navigator. */
  onScreen: boolean;
  /**
   * For each column left of this row's own, whether an ancestor's rail runs through it, so a
   * nested block is drawn beside its parent's rail rather than breaking it.
   */
  trail: boolean[];
  /** A route's own rail: on through to the next route, or ending at this node for the last one. */
  rail: 'through' | 'end' | 'none';
};

/** The containers mounted inside a screen of another, by the key of that screen's route. */
export function hostedContainers(
  containers: readonly NavigationContainerInfo[]
): Map<string, NavigationContainerInfo> {
  const hosted = new Map<string, NavigationContainerInfo>();
  for (const container of containers) {
    if (container.hostRouteKey) hosted.set(container.hostRouteKey, container);
  }
  return hosted;
}

/**
 * Follows the screen the person sees down through containers: a route hosting another container
 * is not the screen, that container's own route on top is, and so on down.
 */
export function resolveOnScreen(
  container: NavigationContainerInfo,
  hosted: Map<string, NavigationContainerInfo>
): NavigationContainerInfo {
  let current = container;
  for (let guard = 0; guard < 8; guard += 1) {
    const child = current.route?.key ? hosted.get(current.route.key) : undefined;
    if (!child || child === current) break;
    current = child;
  }
  return current;
}

/**
 * A navigator state as the rows of an outline, the way an element inspector draws a tree: a
 * navigator's caption, then its routes on a rail under it, with a navigator inside a route hanging
 * under that route one column in. Only the active route's nested navigator is walked, since an
 * inactive tab's is not mounted and its screens are not anything the person can see. A container
 * mounted inside a route, a flow with a container of its own, hangs under that route the same way,
 * under a caption naming it; that route then hosts the screen rather than being it.
 */
export function flattenNavigator(
  state: NavigationState,
  currentKey: string | undefined,
  hosted: Map<string, NavigationContainerInfo> = new Map(),
  depth = 0,
  prefix = 'nav',
  trail: boolean[] = [],
  /** The container this navigator is the root of, drawn as a chip above it. `null` for a nested one. */
  container: string | null = null
): OutlineRow[] {
  const rows: OutlineRow[] = container
    ? [
        {
          key: prefix,
          depth,
          kind: 'container',
          label: container,
          active: true,
          onScreen: false,
          trail,
          rail: 'none',
        },
      ]
    : [];
  const activeIndex = state.index ?? state.routes.length - 1;

  state.routes.forEach((route, index) => {
    const active = index === activeIndex;
    const last = index === state.routes.length - 1;
    const key = `${prefix}/${route.key ?? `${route.name}-${index}`}`;
    const child = route.key ? hosted.get(route.key) : undefined;
    rows.push({
      key,
      depth,
      kind: 'route',
      label: route.name,
      params: route.params,
      active,
      onScreen: child === undefined && route.key !== undefined && route.key === currentKey,
      trail,
      rail: last ? 'end' : 'through',
    });
    if (!active) return;

    // What hangs under this route sits one column in, beside this rail if it carries on.
    const nestedTrail = [...trail, !last];
    if (route.state) {
      rows.push(
        ...flattenNavigator(route.state, currentKey, hosted, depth + 1, `${key}/nav`, nestedTrail)
      );
    }
    if (child?.state) {
      const childPrefix = `${key}/${child.name}`;
      rows.push({
        key: childPrefix,
        depth: depth + 1,
        kind: 'container',
        label: child.name,
        active: true,
        onScreen: false,
        trail: nestedTrail,
        rail: 'none',
      });
      rows.push(
        ...flattenNavigator(
          child.state,
          child.route?.key,
          hosted,
          depth + 1,
          childPrefix,
          nestedTrail
        )
      );
    }
  });

  return rows;
}
