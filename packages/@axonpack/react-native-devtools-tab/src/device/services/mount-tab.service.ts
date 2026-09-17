import type { ComponentType } from "react";

/**
 * On a device there is no page to mount into, so this says so and the caller registers instead.
 *
 * The web half of this file (`mount-tab.service.web.ts`) is what runs in the panel. Metro picks
 * between them by platform, which is also what keeps `react-dom` out of the app's bundle.
 */
export function mountTab(
  _id: string,
  _name: string,
  _component: ComponentType,
): boolean {
  return false;
}

/** Whether this copy of the module is the one running in a tab's page. */
export const IN_PANEL = false;
