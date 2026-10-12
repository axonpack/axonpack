import type { ProviderResult } from "./types";

declare const __DEV__: boolean | undefined;

/** Pretend a store release exists, to try the update flow in a dev build. */
export type MockVersion = Partial<Omit<ProviderResult, "version">> & {
  /** Replaces the installed version. */
  currentVersion?: string;
  /** Replaces the store's answer, so no request is made. */
  latestVersion?: string;
};

let globalMock: MockVersion | undefined;

/** Applies to every check until cleared with `undefined`. Like the `mock` option, it only works when __DEV__ is true. */
export const setMockVersion = (mock: MockVersion | undefined): void => {
  globalMock = mock;
};

export const isDev = (): boolean =>
  typeof __DEV__ !== "undefined" && __DEV__ === true;

/** A mock can never reach a release build: outside __DEV__ it is ignored, not an error. */
export const activeMock = (option?: {
  mock?: MockVersion;
}): MockVersion | undefined =>
  isDev() ? (option?.mock ?? globalMock) : undefined;
