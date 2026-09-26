import type { NavigationContainerRefLike } from './attach-navigation.service';
import type { NavigationRouterKind } from '../stores/navigation.store';

export type DetectedRouter = {
  kind: NavigationRouterKind;
  /**
   * Expo Router keeps its container ref in a module-level store, and its public hook returns that
   * ref reading no context, so it can be asked for from anywhere once the router's root has
   * mounted. Before that it throws, which `attachNavigationRef` treats as an empty ref.
   */
  getContainerRef?: () => NavigationContainerRefLike | undefined;
};

/** The two packages, as loaded. `null` for one that is not installed. */
export type RouterLoaders = {
  expoRouter: () => unknown;
  reactNavigation: () => unknown;
};

/**
 * Each `require` below sits directly inside its own `try`, at module scope, and both halves of that
 * placement are load-bearing.
 *
 * Directly inside the `try`, because that is what Metro marks as an optional dependency: a package
 * that is not installed then becomes a `Cannot find module` throw at this call rather than a build
 * error. Metro looks at the statement around the call and nothing deeper, so moving the call into a
 * helper would break it. Expo's Metro config turns the behaviour on; bare Metro leaves it off, which
 * does not matter here because this package already needs Expo.
 *
 * At module scope, because of how Metro's runtime loads a module. A `require` made while no module
 * is initialising runs inside a guard that hands a failing load to `ErrorUtils.reportFatalError`
 * and returns `undefined`, so a `try` around a call made later, from a render say, catches nothing
 * and the app shows a red box instead. While this module is itself initialising that guard is
 * already held, and a router whose own load throws, such as one whose native modules are not in
 * the binary, lands in the `catch` the way it reads.
 */
let expoRouterModule: unknown = null;
try {
  expoRouterModule = require('expo-router');
} catch {
  // Not installed, or installed and unable to load, which for this tab is the same thing.
}

let reactNavigationModule: unknown = null;
try {
  reactNavigationModule = require('@react-navigation/native');
} catch {
  // As above.
}

const REAL_LOADERS: RouterLoaders = {
  expoRouter: () => expoRouterModule,
  reactNavigation: () => reactNavigationModule,
};

/**
 * Which router the app has installed, found without depending on either.
 *
 * Expo Router first: its current versions ship their own copy of React Navigation's core, so an
 * Expo Router app may have no `@react-navigation/*` package at all, and one that does still wants
 * the automatic path. The loaders are a parameter for the tests alone.
 */
export function detectRouter(loaders: RouterLoaders = REAL_LOADERS): DetectedRouter | null {
  const expoRouter = loaders.expoRouter() as { useNavigationContainerRef?: unknown } | null;
  if (typeof expoRouter?.useNavigationContainerRef === 'function') {
    // Not a hook call: the function reads a module singleton, and naming it this way keeps the
    // hooks lint rule out of a non-component.
    const getContainerRef =
      expoRouter.useNavigationContainerRef as DetectedRouter['getContainerRef'];
    return { kind: 'expo-router', getContainerRef };
  }
  if (loaders.reactNavigation() !== null) return { kind: 'react-navigation' };
  return null;
}

/**
 * React Navigation puts the container itself into this context for everything it renders, which is
 * how a provider mounted inside the container reaches it with no ref. Pure over the module, so a
 * test can hand in a stand-in.
 */
export function containerContextFrom(module: unknown): React.Context<unknown> | null {
  const context = (module as { NavigationContainerRefContext?: unknown } | null)
    ?.NavigationContainerRefContext;
  return typeof context === 'object' && context !== null
    ? (context as React.Context<unknown>)
    : null;
}

export function getReactNavigationContainerContext(): React.Context<unknown> | null {
  return containerContextFrom(reactNavigationModule);
}

/**
 * The route a component is rendered in, which React Navigation puts into this context for every
 * screen. A hook called from a screen reads it to learn which route a container was handed over
 * from, so that container can hang under that route in the outline.
 */
export function routeContextFrom(module: unknown): React.Context<unknown> | null {
  const context = (module as { NavigationRouteContext?: unknown } | null)?.NavigationRouteContext;
  return typeof context === 'object' && context !== null
    ? (context as React.Context<unknown>)
    : null;
}

export function getReactNavigationRouteContext(): React.Context<unknown> | null {
  return routeContextFrom(reactNavigationModule);
}
