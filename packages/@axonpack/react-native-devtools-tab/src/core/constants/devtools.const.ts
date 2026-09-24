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
export const DEVTOOLS_ID = "axonpack-rn-devtools";

export const DEVTOOLS_ROUTE = `/${DEVTOOLS_ID}-tab`;

/**
 * Where the app keeps its tab list, for the frontend to read.
 *
 * A panel is built from what is on here, not from a message, so opening or reloading React Native
 * DevTools finds the tabs that are already registered instead of having to be told about them again.
 * The app has no way of knowing a frontend reloaded, and nothing re-announces, so a push alone left
 * the tab strip empty until the app itself restarted.
 */
export const DEVTOOLS_TABS = `__${DEVTOOLS_ID}_tabs__`;

/**
 * The tab the next DevTools window should open on, left here by `focus()`.
 *
 * A note rather than a message, because the window it is for does not exist yet. `openDebugger` asks
 * Metro for a window and cannot say which panel to show on iOS, and the frontend's own `panel`
 * parameter is read at startup, before any tab of ours has been added. So the window reads this when
 * it connects, the same way it reads the tab list, and clears it so only one window acts on it.
 */
export const DEVTOOLS_FOCUS = `__${DEVTOOLS_ID}_focus__`;
