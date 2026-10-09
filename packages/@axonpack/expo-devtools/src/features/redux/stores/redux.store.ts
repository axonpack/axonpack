import { EventEmitter } from 'expo';

import { createStoreHook } from '../../../core/stores/axon.store';
import { coalesceNotify } from '../../../core/utils/coalesce-notify.util';
import { isActionTypeRecorded, type ActionTypeMatcher } from '../utils/action-type-lists.util';

/** What a Redux action has to be for the tab to show it: a plain object with a string `type`. */
export type ReduxAction = { type: string; [key: string]: unknown };

/**
 * One row in the Redux tab: an action the store reduced. Read them with
 * `devtools.reduxStore.getSnapshot()`; the store keeps the most recent 200, newest first.
 */
export type ReduxActionEntry = {
  /** Unique id for this row, stable for as long as it is in the buffer. */
  id: string;
  /** When the reducer finished with it, as `Date.now()` milliseconds. */
  timestamp: number;
  type: string;
  /** The whole action as dispatched, `type` included. */
  action: ReduxAction;
  /** The state before the action. Redux never mutates it, so holding the reference is enough. */
  prevState: unknown;
  /** The state after the action. */
  state: unknown;
};

/** The part of a Redux store the tab calls. Structural, so the package needs no redux types. */
export type ReduxStoreLike = {
  getState(): unknown;
  dispatch(action: ReduxAction): unknown;
};

type ReduxEvents = {
  change: () => void;
};

const MAX_ENTRIES = 200;

let entries: ReduxActionEntry[] = [];
let attached: ReduxStoreLike | null = null;
let paused = false;
let enabled = false;
let allow: readonly ActionTypeMatcher[] = [];
let deny: readonly ActionTypeMatcher[] = [];
let sequence = 0;

const emitter = new EventEmitter<ReduxEvents>();
const notify = coalesceNotify(emitter);

export const reduxStore = {
  getSnapshot(): ReduxActionEntry[] {
    return entries;
  },
  /** Whether the app added the enhancer. The tab is only there once it has. */
  isAttached(): boolean {
    return attached !== null;
  },
  /** Read live from the app's store: Redux hands back the same object until something changes. */
  getCurrentState(): unknown {
    return attached?.getState();
  },
  getAllowList(): readonly ActionTypeMatcher[] {
    return allow;
  },
  getDenyList(): readonly ActionTypeMatcher[] {
    return deny;
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
  /**
   * Called by the enhancer when the app creates its store, which is usually at import time and
   * before the provider has started, so it does not wait for `enabled`. Attaching costs nothing:
   * until the start, `record` returns straight away. A second store replaces the first.
   */
  attach(store: ReduxStoreLike) {
    attached = store;
    notify();
  },
  setActionLists(next: {
    allow?: readonly ActionTypeMatcher[];
    deny?: readonly ActionTypeMatcher[];
  }) {
    if (next.allow) allow = next.allow;
    if (next.deny) deny = next.deny;
    notify();
  },
  /** Stop recording one type from the panel, for the action that fires dozens of times a second. */
  denyType(type: string) {
    if (deny.includes(type)) return;
    deny = [...deny, type];
    notify();
  },
  /** Undo `denyType`, or drop any other entry of the deny list. */
  removeDenied(matcher: ActionTypeMatcher) {
    deny = deny.filter((entry) => entry !== matcher);
    notify();
  },
  /**
   * The one way an action gets in. The current state follows every action, paused or filtered out
   * or not: pausing and the lists stop the history, and the state is a live reading, not a row.
   */
  record(action: ReduxAction, prevState: unknown, state: unknown) {
    if (!enabled) return;
    if (!paused && isActionTypeRecorded(action.type, allow, deny)) {
      sequence += 1;
      const entry = {
        id: `redux-${sequence}`,
        timestamp: Date.now(),
        type: action.type,
        action,
        prevState,
        state,
      };
      entries = [entry, ...entries].slice(0, MAX_ENTRIES);
    }
    notify();
  },
  /**
   * Runs the action through the app's store, so it lands in the history like any other. Returns an
   * error message, or `null` when it went through. Middleware the app applied outside the enhancer
   * does not see it, because the enhancer only holds the store underneath that middleware.
   */
  dispatch(action: ReduxAction): string | null {
    if (!attached) return 'No Redux store is attached.';
    try {
      attached.dispatch(action);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  },
  clear() {
    entries = [];
    notify();
  },
  /** Test-only; nothing detaches a store for the life of the process otherwise. */
  reset() {
    entries = [];
    attached = null;
    paused = false;
    enabled = false;
    allow = [];
    deny = [];
    notify();
  },
};

export const useReduxStore = createStoreHook(reduxStore.subscribe);
