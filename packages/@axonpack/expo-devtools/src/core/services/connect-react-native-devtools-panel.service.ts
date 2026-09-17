import { ReactNativeDevtoolsPanel } from '@axonpack/react-native-devtools-tab';

import { OverviewTab } from '../components/devtools-tabs/overview-tab.component';

let started = false;

/**
 * Mirrors the on-device panel into React Native DevTools.
 *
 * The overview is a component running in the app, so it reads the same stores the device does and a
 * button here clears the real one.
 */
export function connectReactNativeDevtoolsPanel(): void {
  if (started) return;
  started = true;

  // TODO(network): the Network tab is not registered. Its page still builds under `panel/` and is
  // still served at /axonpack-panel/, but a tab is a component now and `TabOptions` no longer takes
  // a url. It needs either that escape hatch back or the page rewritten as a component.

  ReactNativeDevtoolsPanel.registerTab({
    id: 'overview',
    name: 'Axonpack',
    component: OverviewTab,
  });
}

/**
 * Started at import rather than from `startDevtools`, so the channel is already waiting by the time
 * the app has finished importing.
 *
 * `__DEV__` rather than `config.enabled`, because a release build has no DevTools to connect to at
 * all. It is a compile-time constant, so the whole thing goes away in one.
 */
if (__DEV__) connectReactNativeDevtoolsPanel();
