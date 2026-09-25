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
  /** The container whose track this row is on, which decides the colour of its rail and chip. */
  container: string;
  /**
   * For each column left of this row's own, the container whose rail runs through it, or `null`
   * where none does, so a nested block is drawn beside its parent's rail in that rail's colour.
   */
  trail: (string | null)[];
  /** A route's own rail: on through to the next route, or ending at this node for the last one. */
  rail: 'through' | 'end' | 'none';
  /** The container this route hosts, when a flow with a container of its own is mounted in it. */
  hosts?: string;
  /** Whether that hosted container is drawn under the route right now. */
  open?: boolean;
  /** What `open` is with nobody having touched it: open when the host is on screen. */
  openByDefault?: boolean;
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
 * under a caption naming it; that route is on screen along with the flow's own route on top.
 */
export function flattenNavigator(
  state: NavigationState,
  currentKey: string | undefined,
  hosted: Map<string, NavigationContainerInfo> = new Map(),
  depth = 0,
  prefix = 'nav',
  trail: (string | null)[] = [],
  /** The container whose track this is. */
  owner = 'root',
  /** Draw the container's chip above this navigator: true at the root of a container. */
  chip = true,
  /**
   * Hosted containers opened or closed by hand, by host row key, with the default they were
   * changed from. The choice lasts only while that default holds, so a host coming on screen
   * always opens and one left behind always closes.
   */
  toggled: ReadonlyMap<string, { open: boolean; from: boolean }> = new Map(),
  /** Whether this navigator is on the path to what the person sees, rather than under a past screen. */
  visible = true
): OutlineRow[] {
  const rows: OutlineRow[] = chip
    ? [
        {
          key: prefix,
          depth,
          kind: 'container',
          label: owner,
          container: owner,
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
      // A route hosting another container is on screen too: the flow is drawn inside it.
      onScreen: route.key !== undefined && route.key === currentKey,
      container: owner,
      trail,
      rail: last ? 'end' : 'through',
    });
    const row = rows[rows.length - 1];
    // Open by default when the host is on the way down to the screen the person sees.
    const onPath = active && visible;
    const openByDefault = onPath;
    const choice = toggled.get(key);
    const open = child?.state
      ? choice && choice.from === openByDefault
        ? choice.open
        : openByDefault
      : false;
    if (child?.state) {
      row.hosts = child.name;
      row.open = open;
      row.openByDefault = openByDefault;
    }
    if (!active && !open) return;

    // What hangs under this route sits one column in, beside this rail if it carries on.
    const nestedTrail = [...trail, last ? null : owner];
    // An inactive route's own nested navigator is still skipped: an inactive tab's is not mounted.
    if (route.state && active) {
      rows.push(
        ...flattenNavigator(
          route.state,
          currentKey,
          hosted,
          depth + 1,
          `${key}/nav`,
          nestedTrail,
          owner,
          false,
          toggled,
          visible
        )
      );
    }
    if (child?.state && open) {
      rows.push(
        ...flattenNavigator(
          child.state,
          // On screen only through a host that is on the path: a flow under a past screen is
          // mounted, not seen.
          onPath ? child.route?.key : undefined,
          hosted,
          depth + 1,
          `${key}/${child.name}`,
          nestedTrail,
          child.name,
          true,
          toggled,
          onPath
        )
      );
    }
  });

  return rows;
}
