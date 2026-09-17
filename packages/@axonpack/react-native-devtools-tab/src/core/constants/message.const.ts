/**
 * Every message type on the wire, and what each carries.
 *
 * None of these name their tab, because the channel does. `createTabChannel` stamps the id on the
 * way out and drops anything addressed elsewhere on the way in, so what actually crosses is the
 * payload below plus that one field.
 */

import type { RemoteOp } from "./remote-op.const";

/** App to panel, once per tab: the tab exists, and this is what to call it. */
export const REGISTER = "tab:register";

/** App to panel, on every render: what React just changed. */
export const MUTATE = "tab:mutate";

/** Panel to app: something in the tab was clicked, typed in, or otherwise acted on. */
export const ACTION = "tab:action";

/** Panel to app, on load: "describe yourself", since the app usually started first. */
export const HELLO = "tab:hello";

export type TabRegistration = { name: string; icon?: string };

export type TabMutation = { ops: RemoteOp[] };

/** `action` is the name a function prop was swapped for, not something anybody chose. */
export type TabAction = { action: string; payload?: unknown };
