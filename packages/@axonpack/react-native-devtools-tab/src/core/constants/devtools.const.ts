/**
 * The one name the app's side and the dev server's side have to agree on.
 *
 * It names the HTTP route the panel is served from, and the domain messages are tagged with on the
 * debugger connection. React Native's own integration uses `react-devtools` on that same channel, so
 * having a name at all is what keeps the two apart.
 *
 * A constant rather than an option, because nothing makes it vary: the dispatcher is per JS runtime
 * and each dev server has its own port, so two apps never share either. Only two independent
 * devtools instances *inside one app* would need to differ, and there is no such case.
 */
export const DEVTOOLS_ID = "devtools";

export const DEVTOOLS_ROUTE = `/${DEVTOOLS_ID}-tab`;
