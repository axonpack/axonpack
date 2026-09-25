import type { ReactNode } from 'react';

import {
  DevtoolsOverlay,
  type DevtoolsOverlayProps,
} from './devtools-overlay/devtools-overlay.component';
import { startDevtools, type DevtoolsConfig } from '../../client/start-devtools.client';
import { CrashReportOverlay } from '../../features/crash/components/crash-report-overlay.component';
import { NavigationContextBridge } from '../../features/navigation/components/navigation-context-bridge.component';

/**
 * Props for `<DevtoolsProvider />`. All optional: the loose ones style the launcher button (see
 * `DevtoolsOverlayProps`) and `config` is everything else.
 */
export type DevtoolsProviderProps<TThemeName extends string = never> = DevtoolsOverlayProps & {
  /**
   * Everything the devtools can be configured with — see `DevtoolsConfig`. Read **once**, on the
   * first render: the patches are global and go in one time, so rebuilding the object on a later
   * render changes nothing and an inline literal is fine.
   */
  config?: DevtoolsConfig<TThemeName>;
  /**
   * Whether the draggable bug button is drawn. Defaults to `true`.
   *
   * Turning it off leaves the panel fully working and only takes away that way in — open it from your
   * own UI with `useDevtoolsPanel()`. For an app whose screens the button would sit on top of.
   */
  showFloatingButton?: boolean;
  children?: ReactNode;
};

/**
 * Starts the devtools and hosts the panel. Wrap your app in it once, as high up as you can:
 *
 * ```tsx
 * export default function App() {
 *   return (
 *     <DevtoolsProvider config={{ enabled: __DEV__ }}>
 *       <RootNavigator />
 *     </DevtoolsProvider>
 *   );
 * }
 * ```
 *
 * With `enabled: false` it renders its children and the crash sheet and nothing else: no patches, no
 * button, no panel. That makes the mount safe to leave in a release build unguarded.
 *
 * Mounted inside a React Navigation container, it finds that container on its own; above one, the
 * app hands the container over with `useDevtoolsNavigation`.
 */
export function DevtoolsProvider<TThemeName extends string = never>({
  config,
  showFloatingButton = true,
  children,
  ...buttonProps
}: DevtoolsProviderProps<TThemeName>) {
  /**
   * During render, not in an effect. A parent's effects run *after* its children's, so an effect here
   * would install the patches after the app's own first mount — and the requests an app fires from
   * that first effect are the ones worth seeing.
   *
   * Unguarded because `startDevtools` guards itself: the second call is a no-op, so a re-render costs
   * a function call.
   */
  startDevtools(config);

  const enabled = config?.enabled ?? true;

  return (
    <>
      {children}
      {/* The crash sheet is the one thing that works with the devtools off, so it is mounted either
          way. `DevtoolsOverlay` mounts its own, and they de-duplicate. */}
      {enabled ? (
        <>
          <NavigationContextBridge />
          <DevtoolsOverlay {...buttonProps} showButton={showFloatingButton} />
        </>
      ) : (
        <CrashReportOverlay />
      )}
    </>
  );
}
