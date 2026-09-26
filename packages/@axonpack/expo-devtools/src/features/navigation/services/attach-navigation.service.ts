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

type Attachment = {
  name: string;
  via: NavigationAttachment;
  hostRouteKey: string | undefined;
  ref: NavigationContainerRefLike;
  container: NavigationContainerLike | null;
  stopListening: (() => void) | null;
  timer: ReturnType<typeof setInterval> | null;
};

/** How often an empty ref is looked at again, and for how long, before the tab stops waiting. */
const POLL_INTERVAL_MS = 250;
const POLL_ATTEMPTS = 80;

/** Every container handed over and still mounted, by name. All of them are followed at once. */
const attachments = new Map<string, Attachment>();
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

function listen(entry: Attachment, navigation: NavigationContainerLike): () => void {
  let pending: PendingAction | null = null;
  let lastState = navigation.getRootState();
  let lastRoute = toRoute(navigation.getCurrentRoute());

  function record(
    action: PendingAction['action'],
    stack: string | undefined,
    state: NavigationState | undefined,
    noop: boolean
  ) {
    const to = toRoute(navigation.getCurrentRoute());
    const move: NavigationMove = {
      id: nextId(),
      container: entry.name,
      timestamp: Date.now(),
      action: action.type,
      payload: action.payload,
      from: lastRoute,
      to,
      noop,
      origin: stack ? parseStack(stack) : undefined,
      state,
    };
    navigationStore.record(move);
    lastState = state;
    lastRoute = to;
  }

  navigationStore.attachContainer(entry.name, entry.via, entry.hostRouteKey);

  // The container mounts before its navigator, and a navigator can mount much later, in a tab or a
  // modal. Until it does there is no state, and the first `state` event writes the first row.
  if (lastState) {
    lastRoute = null;
    record({ type: 'INITIAL' }, undefined, lastState, false);
  }

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

  entry.container = navigation;

  return () => {
    stopActions();
    stopStates();
    entry.container = null;
    navigationStore.detachContainer(entry.name);
  };
}

function stop(entry: Attachment) {
  if (entry.timer) clearInterval(entry.timer);
  entry.timer = null;
  entry.stopListening?.();
  entry.stopListening = null;
}

/**
 * Hands a container over under a name. The ref is empty until its container mounts, which can be
 * after the caller's own effect, so an empty one is looked at again for a while rather than given
 * up on. Readiness is not waited for: a container with no navigator yet is listened to all the
 * same, and reports its first state when one mounts. A name handed over twice is one container,
 * and the later attachment replaces the earlier. Returns the detach for this one.
 */
export function attachNavigationRef(
  ref: NavigationContainerRefLike,
  name: string,
  via: NavigationAttachment,
  /** The route of another container this one is mounted in, when it is. */
  hostRouteKey?: string
): () => void {
  const previous = attachments.get(name);
  if (previous) stop(previous);

  const entry: Attachment = {
    name,
    via,
    hostRouteKey,
    ref,
    container: null,
    stopListening: null,
    timer: null,
  };
  attachments.set(name, entry);

  function tryAttach(): boolean {
    let current: NavigationContainerLike | null;
    try {
      current = ref.current;
    } catch {
      // Expo Router's ref throws until its root has mounted, which is the same as being empty.
      current = null;
    }
    if (!current) return false;
    entry.stopListening = listen(entry, current);
    return true;
  }

  if (!tryAttach()) {
    let attempts = 0;
    entry.timer = setInterval(() => {
      attempts += 1;
      if (tryAttach() || attempts >= POLL_ATTEMPTS) {
        clearInterval(entry.timer!);
        entry.timer = null;
      }
    }, POLL_INTERVAL_MS);
  }

  return () => {
    if (attachments.get(name) !== entry) return;
    stop(entry);
    attachments.delete(name);
  };
}

/** Takes every container back. Test-only; a mounted app only ever takes back its own. */
export function detachNavigation() {
  for (const entry of attachments.values()) stop(entry);
  attachments.clear();
}

function containerNamed(name: string | null): NavigationContainerLike | null {
  if (name === null) return null;
  return attachments.get(name)?.container ?? null;
}

/**
 * Runs the real navigator, so the app sees the move exactly as it sees its own. Acts on the named
 * container, or on the focused one when none is named.
 */
export function navigateTo(
  routeName: string,
  params?: object,
  container: string | null = navigationStore.getFocused()
): string | null {
  const navigation = containerNamed(container);
  if (!navigation) return 'No navigator is attached.';
  try {
    navigation.navigate(routeName, params);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export function goBack(container: string | null = navigationStore.getFocused()): string | null {
  const navigation = containerNamed(container);
  if (!navigation) return 'No navigator is attached.';
  if (!navigation.canGoBack()) return 'There is nothing to go back to.';
  navigation.goBack();
  return null;
}

export function canGoBack(container: string | null = navigationStore.getFocused()): boolean {
  return containerNamed(container)?.canGoBack() ?? false;
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
