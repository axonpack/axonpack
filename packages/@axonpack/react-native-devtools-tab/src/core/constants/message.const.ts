/**
 * Every message type on the wire, and what each carries.
 *
 * Three of them are the tab protocol and the rest of the channel is the consumer's. Keeping the
 * names here means neither end can drift from the other.
 */

import type { UiNode } from "./ui-node.const";

/** App to panel, once per tab: the layout, the tab's name, and the state it starts with. */
export const REGISTER = "tab:register";

/** App to panel, whenever state changes: only the slices that changed. */
export const STATE = "tab:state";

/** Panel to app: a button was pressed or an input was typed in. */
export const ACTION = "tab:action";

/** Panel to app, on load: "describe yourself", since the app usually started first. */
export const HELLO = "tab:hello";

export type TabRegistration = {
  id: string;
  name: string;
  icon?: string;
  /** Absent when the tab draws itself; see `url`. */
  layout?: UiNode;
  /** A page of the consumer's own, shown instead of the one this package ships. */
  url?: string;
  state: Record<string, unknown>;
};

export type StateUpdate = { id: string; state: Record<string, unknown> };

export type TabAction = { id: string; action: string; payload?: unknown };
