/**
 * Every message type on the wire, and what each carries.
 *
 * Four of them are the tab protocol and the rest of the channel is the consumer's. Keeping the names
 * here means neither end can drift from the other.
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

export type TabRegistration = {
  id: string;
  name: string;
  icon?: string;
};

export type TabMutation = { id: string; ops: RemoteOp[] };

/** `action` is the name a function prop was swapped for, not something anybody chose. */
export type TabAction = { id: string; action: string; payload?: unknown };
