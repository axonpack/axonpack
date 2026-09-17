/**
 * Every message type on the wire, and what each carries.
 *
 * None of these name their tab, because the channel does. `createTabChannel` stamps the id on the
 * way out and drops anything addressed elsewhere on the way in, so what actually crosses is the
 * payload below plus that one field.
 *
 * There is only one of them now. A tab's page is built by Metro and draws itself, so nothing about
 * what a tab looks like crosses the debugger connection any more; this says a tab exists and what to
 * call it, which is all the DevTools frontend needs to put it in the strip.
 */

/** App to panel, once per tab: the tab exists, and this is what to call it. */
export const REGISTER = "tab:register";

export type TabRegistration = { name: string; icon?: string };
