/**
 * `@types/react-reconciler` tracks the old versions rather than this one, and the whole host config
 * is passed as one object anyway. So the two calls this package makes are declared here, next to the
 * only file that makes them, the same way `metro/node.d.ts` declares the Node APIs it uses.
 */

declare module "react-reconciler" {
  import type { ReactNode } from "react";

  export default function createReconciler(config: unknown): {
    createContainer(
      container: unknown,
      tag: number,
      hydrationCallbacks: unknown,
      isStrictMode: boolean,
      concurrentUpdatesByDefaultOverride: boolean | null,
      identifierPrefix: string,
      onUncaughtError: (error: unknown) => void,
      onCaughtError: unknown,
      onRecoverableError: unknown,
    ): unknown;

    updateContainer(
      element: ReactNode,
      container: unknown,
      parentComponent: unknown,
      callback: unknown,
    ): void;
  };
}

declare module "react-reconciler/constants" {
  export const DefaultEventPriority: number;
}
