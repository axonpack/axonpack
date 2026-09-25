import { EventEmitter } from 'expo';

import { createStoreHook } from '../../../core/stores/axon.store';
import { coalesceNotify } from '../../../core/utils/coalesce-notify.util';
import type { StackFrame } from '../../../core/utils/parse-stack.util';

/** Which router the start found installed. `null` means neither, and then there is no tab. */
export type NavigationRouterKind = 'expo-router' | 'react-navigation';

/**
 * How a container was reached: Expo Router's own store, React Navigation's context from a
 * provider inside the container, or the hook from a provider above it.
 */
export type NavigationAttachment = 'expo-router' | 'context' | 'hook';

/** The container found on its own, by context or by Expo Router, and the hook's default name. */
export const ROOT_CONTAINER = 'root';

/**
 * A route as React Navigation reports it. `path` is the URL path, which only exists where linking
 * is configured: Expo Router sets one on every route, a plain React Navigation app may set none.
 */
export type NavigationRoute = {
  key: string;
  name: string;
  /** Whatever the screen was given. `object` rather than a record, which is how the library types it. */
  params?: object;
  path?: string;
};

/**
 * The navigator state tree as `getRootState()` hands it over. Structural on purpose: the tab draws
 * whatever it is given and never builds one, so it declares only what it reads.
 */
export type NavigationState = {
  key?: string;
  type?: string;
  index?: number;
  routeNames?: readonly string[];
  stale?: boolean;
  routes: readonly {
    key?: string;
    name: string;
    params?: object;
    path?: string;
    state?: NavigationState;
  }[];
};

/**
 * One row in the Navigation tab: a move a navigator made. Read them with
 * `devtools.navigationStore.getSnapshot()`; the store keeps the most recent 200, newest first.
 */
export type NavigationMove = {
  /** Unique id for this row, stable for as long as it is in the buffer. */
  id: string;
  /** The container that moved: `root`, or the name the hook was given. */
  container: string;
  /** When the navigator changed, as `Date.now()` milliseconds. */
  timestamp: number;
  /**
   * The action's type as React Navigation names it: `NAVIGATE`, `GO_BACK`, `JUMP_TO`, `PUSH`...
   * `INITIAL` for a container's first row, written when it was found. `UNKNOWN` when the state
   * changed with no action ahead of it, which is how a change made outside a dispatch arrives.
   */
  action: string;
  /** What the action carried: the route name, the params, and whatever else was dispatched. */
  payload?: Record<string, unknown>;
  /** The route on top before the move. `null` on a container's first row. */
  from: NavigationRoute | null;
  /** The route on top after it. */
  to: NavigationRoute | null;
  /** The action left the state as it was, such as navigating to the screen already on top. */
  noop: boolean;
  /**
   * The dispatching call's stack, as React Navigation captures it in a development build. Raw,
   * because turning it into a file name is a request to the development server and most rows are
   * never opened.
   */
  origin?: StackFrame[];
  /** The root state after the move. */
  state?: NavigationState;
};

/** A container being followed: what it is called, how it was reached, and what is on top of it. */
export type NavigationContainerInfo = {
  name: string;
  via: NavigationAttachment;
  route: NavigationRoute | null;
  state: NavigationState | null;
};

type NavigationEvents = {
  change: () => void;
};

const MAX_MOVES = 200;

let moves: NavigationMove[] = [];
let routerKind: NavigationRouterKind | null = null;
/** In the order they were attached. Every one is followed; `focused` is the one the toolbar acts on. */
let containers: NavigationContainerInfo[] = [];
let focused: string | null = null;
let paused = false;
let enabled = false;
let redact: ((move: NavigationMove) => NavigationMove | null) | undefined;

const emitter = new EventEmitter<NavigationEvents>();
const notify = coalesceNotify(emitter);

function findContainer(name: string | null): NavigationContainerInfo | null {
  if (name === null) return null;
  return containers.find((container) => container.name === name) ?? null;
}

export const navigationStore = {
  getSnapshot(): NavigationMove[] {
    return moves;
  },
  getRouterKind(): NavigationRouterKind | null {
    return routerKind;
  },
  /** Whether any container is being followed. */
  isAttached(): boolean {
    return containers.length > 0;
  },
  getContainers(): NavigationContainerInfo[] {
    return containers;
  },
  /** The container the toolbar acts on and the card shows: the one that moved last, or the one picked. */
  getFocused(): string | null {
    return focused;
  },
  getFocusedContainer(): NavigationContainerInfo | null {
    return findContainer(focused);
  },
  getCurrentRoute(): NavigationRoute | null {
    return findContainer(focused)?.route ?? null;
  },
  getRootState(): NavigationState | null {
    return findContainer(focused)?.state ?? null;
  },
  getAttachment(): NavigationAttachment | null {
    return findContainer(focused)?.via ?? null;
  },
  isPaused(): boolean {
    return paused;
  },
  isEnabled(): boolean {
    return enabled;
  },
  subscribe(listener: () => void) {
    const subscription = emitter.addListener('change', listener);
    return () => subscription.remove();
  },
  setEnabled(nextEnabled: boolean) {
    enabled = nextEnabled;
    notify();
  },
  setPaused(nextPaused: boolean) {
    paused = nextPaused;
    notify();
  },
  setRouterKind(kind: NavigationRouterKind | null) {
    routerKind = kind;
    notify();
  },
  /** A name attached twice is one container: the later attachment replaces the earlier. */
  attachContainer(name: string, via: NavigationAttachment) {
    containers = [
      ...containers.filter((container) => container.name !== name),
      { name, via, route: null, state: null },
    ];
    focused = name;
    notify();
  },
  detachContainer(name: string) {
    containers = containers.filter((container) => container.name !== name);
    if (focused === name) focused = containers[containers.length - 1]?.name ?? null;
    notify();
  },
  setFocused(name: string) {
    if (findContainer(name)) focused = name;
    notify();
  },
  /**
   * Runs on every move before anything is stored. Set once, as the client starts. A hook that
   * throws drops the move: keeping it could store the very value the hook was written to remove.
   */
  setRedaction(next: ((move: NavigationMove) => NavigationMove | null) | undefined) {
    redact = next;
  },
  /**
   * The one way a move gets in. The container's route follows every move, paused or not: pausing
   * stops the history, and the route on top is a live reading rather than a row. Both go through
   * the redaction hook first, so a token in a param never reaches the card either. The container
   * that moved becomes the focused one, since it is the one being used.
   */
  record(move: NavigationMove) {
    if (!enabled) return;

    let redacted: NavigationMove | null = move;
    if (redact) {
      try {
        redacted = redact(move);
      } catch {
        redacted = null;
      }
    }
    if (redacted === null) return;

    const entry = redacted;
    containers = containers.map((container) =>
      container.name === entry.container
        ? { ...container, route: entry.to, state: entry.state ?? null }
        : container
    );
    if (findContainer(entry.container)) focused = entry.container;
    if (!paused) moves = [entry, ...moves].slice(0, MAX_MOVES);
    notify();
  },
  clear() {
    moves = [];
    notify();
  },
  /** Test-only; nothing detaches every container for the life of the process otherwise. */
  reset() {
    moves = [];
    routerKind = null;
    containers = [];
    focused = null;
    paused = false;
    enabled = false;
    redact = undefined;
    notify();
  },
};

export const useNavigationStore = createStoreHook(navigationStore.subscribe);
