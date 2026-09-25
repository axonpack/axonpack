import { Linking } from 'react-native';

import { parseStack } from '../../../core/utils/parse-stack.util';
import {
  navigationStore,
  type NavigationAttachment,
  type NavigationMove,
  type NavigationRoute,
  type NavigationState,
} from '../stores/navigation.store';

/**
 * The part of a React Navigation container ref this package calls. A duck type rather than the
 * library's own, the way the storage drivers are typed, so neither router is needed to compile
 * this package. Expo Router's own copy of the core hands over the same shape.
 */
export type NavigationContainerLike = {
  getRootState(): NavigationState | undefined;
  getCurrentRoute(): NavigationRoute | undefined;
  addListener(type: string, listener: (event: { data?: any }) => void): () => void;
  navigate(name: string, params?: object): void;
  goBack(): void;
  canGoBack(): boolean;
};

/** What `createNavigationContainerRef()` and Expo Router's `useNavigationContainerRef()` return. */
export type NavigationContainerRefLike = {
  readonly current: NavigationContainerLike | null;
};

type PendingAction = {
  action: { type: string; payload?: Record<string, unknown> };
  stack?: string;
};

/** How often an empty ref is looked at again, and for how long, before the tab stops waiting. */
const POLL_INTERVAL_MS = 250;
const POLL_ATTEMPTS = 80;

type Attachment = {
  ref: NavigationContainerRefLike;
  via: NavigationAttachment;
  stopListening: (() => void) | null;
  timer: ReturnType<typeof setInterval> | null;
};

/**
 * Every container handed over and still mounted, oldest first. The newest is the one followed: a
 * modal flow with a container of its own is what is on screen while it is up, and the container
 * under it is what comes back when it goes. Several at once, side by side, is not built.
 */
const attachments: Attachment[] = [];
let active: Attachment | null = null;
let container: NavigationContainerLike | null = null;
let sequence = 0;

function toRoute(route: NavigationRoute | undefined): NavigationRoute | null {
  if (!route) return null;
  return {
    key: route.key,
    name: route.name,
    params: route.params,
    path: route.path,
  };
}

function nextId(): string {
  sequence += 1;
  return `nav-${Date.now()}-${sequence}`;
}

function listen(navigation: NavigationContainerLike, via: NavigationAttachment): () => void {
  let pending: PendingAction | null = null;
  let lastState = navigation.getRootState();

  function record(
    action: PendingAction['action'],
    stack: string | undefined,
    state: NavigationState | undefined,
    noop: boolean
  ) {
    const move: NavigationMove = {
      id: nextId(),
      timestamp: Date.now(),
      action: action.type,
      payload: action.payload,
      from: navigationStore.getCurrentRoute(),
      to: toRoute(navigation.getCurrentRoute()),
      noop,
      origin: stack ? parseStack(stack) : undefined,
      state,
    };
    navigationStore.record(move);
    lastState = state;
  }

  // The container mounts before its navigator, and a navigator can mount much later, in a tab or a
  // modal. Until it does there is no state, and the first `state` event writes the first row.
  if (lastState) record({ type: 'INITIAL' }, undefined, lastState, false);

  /**
   * Two events, paired the way React Navigation's own devtools pair them. The action fires first
   * and says what was asked for; the state event that follows says what came of it. An action that
   * changed nothing never gets a state event, so it is written straight away and marked.
   */
  const stopActions = navigation.addListener('__unsafe_action__', (event) => {
    const { action, noop, stack } = (event.data ?? {}) as PendingAction & { noop: boolean };
    if (!action) return;
    if (noop) record(action, stack, lastState, true);
    else pending = { action, stack };
  });

  const stopStates = navigation.addListener('state', () => {
    const state = navigation.getRootState();
    const change = pending;
    pending = null;

    // Same object, nothing asked for it: a re-emit, which is not a move anybody made.
    if (!change && state === lastState) return;

    const action = change?.action ?? { type: lastState ? 'UNKNOWN' : 'INITIAL' };
    record(action, change?.stack, state, false);
  });

  container = navigation;
  navigationStore.setAttached(true, via);

  return () => {
    stopActions();
    stopStates();
    container = null;
    navigationStore.setAttached(false);
  };
}

function stop(entry: Attachment) {
  if (entry.timer) clearInterval(entry.timer);
  entry.timer = null;
  entry.stopListening?.();
  entry.stopListening = null;
}

/**
 * Starts following one attachment. The ref is empty until its container mounts, which can be after
 * the caller's own effect, so an empty one is looked at again for a while rather than given up on.
 * Readiness is not waited for: a container with no navigator yet is listened to all the same, and
 * reports its first state when one mounts.
 */
function follow(entry: Attachment) {
  if (active) stop(active);
  active = entry;

  function tryAttach(): boolean {
    let current: NavigationContainerLike | null;
    try {
      current = entry.ref.current;
    } catch {
      // Expo Router's ref throws until its root has mounted, which is the same as being empty.
      current = null;
    }
    if (!current) return false;
    entry.stopListening = listen(current, entry.via);
    return true;
  }

  if (tryAttach()) return;
  let attempts = 0;
  entry.timer = setInterval(() => {
    attempts += 1;
    if (tryAttach() || attempts >= POLL_ATTEMPTS) {
      clearInterval(entry.timer!);
      entry.timer = null;
    }
  }, POLL_INTERVAL_MS);
}

/**
 * Hands a container over. The newest handed over is the one followed, and when it is taken back
 * the one before it is followed again. Returns the detach for this one.
 */
export function attachNavigationRef(
  ref: NavigationContainerRefLike,
  via: NavigationAttachment
): () => void {
  const entry: Attachment = { ref, via, stopListening: null, timer: null };
  attachments.push(entry);
  follow(entry);

  return () => {
    const index = attachments.indexOf(entry);
    if (index === -1) return;
    attachments.splice(index, 1);
    if (active !== entry) return;
    stop(entry);
    active = null;
    const previous = attachments[attachments.length - 1];
    if (previous) follow(previous);
  };
}

/** Takes every container back. Test-only; a mounted app only ever takes back its own. */
export function detachNavigation() {
  for (const entry of attachments) stop(entry);
  attachments.length = 0;
  active = null;
}

/** Runs the real navigator, so the app sees the move exactly as it sees its own. */
export function navigateTo(name: string, params?: object): string | null {
  if (!container) return 'No navigator is attached.';
  try {
    container.navigate(name, params);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export function goBack(): string | null {
  if (!container) return 'No navigator is attached.';
  if (!container.canGoBack()) return 'There is nothing to go back to.';
  container.goBack();
  return null;
}

export function canGoBack(): boolean {
  return container?.canGoBack() ?? false;
}

/** Hands the URL to the OS, which is how a deep link reaches the router in a running app. */
export async function openLink(url: string): Promise<string | null> {
  try {
    await Linking.openURL(url);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}
