import { createElement, type ComponentType } from "react";
import { createRoot } from "react-dom/client";

import { TabFrame } from "../components/tab-frame.component";

/**
 * A tab draws itself.
 *
 * This module is the panel's page: Metro built the app's own tab module for the web, so
 * `react-native` here is react-native-web and the components are the app's, unchanged and
 * untranslated. Every registered tab is in this bundle, and the one named in the query string is
 * the one that mounts. The rest do nothing, which is what makes a single bundle serve every tab.
 */
export function mountTab(
  id: string,
  name: string,
  component: ComponentType,
): boolean {
  if (new URLSearchParams(window.location.search).get("tab") !== id)
    return false;

  const container = document.getElementById("root");
  if (!container) return false;

  createRoot(container).render(createElement(TabFrame, { name, component }));

  return true;
}

export const IN_PANEL = true;
