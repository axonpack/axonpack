import { useCallback, useEffect, useRef, useState } from "react";

import { needUpdate } from "./need-update";
import { openStore } from "./open-store";
import { reactNative } from "./runtime";
import type { NeedUpdateOption, NeedUpdateResult } from "./types";

/** AsyncStorage, MMKV adapters and localStorage-shaped objects all fit. */
export type SkipStorage = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
};

export type UseVersionCheckOptions = NeedUpdateOption & {
  /** Default true. */
  enabled?: boolean;
  /** Check again when the app returns to the foreground. Default true. */
  refreshOnForeground?: boolean;
  /** Where "skip this version" is remembered. Without it, a skip lasts until the app restarts. */
  skipStorage?: SkipStorage;
  skipStorageKey?: string;
};

export type UseVersionCheckState = {
  isLoading: boolean;
  error: Error | undefined;
  result: NeedUpdateResult | undefined;
  isNeeded: boolean;
  isForced: boolean;
  storeUrl: string | undefined;
  latestVersion: string | undefined;
  currentVersion: string | undefined;
  releaseNotes: string | undefined;
  refresh: () => Promise<void>;
  /** Mutes the current soft update. A forced update ignores it. */
  skipVersion: () => Promise<void>;
  openStore: () => Promise<void>;
};

export const useVersionCheck = (
  options: UseVersionCheckOptions = {},
): UseVersionCheckState => {
  // Callers pass inline objects, so the latest options live in a ref and do not re-trigger the effect.
  const latest = useRef(options);
  latest.current = options;
  const enabled = options.enabled ?? true;

  const [state, setState] = useState<{
    isLoading: boolean;
    error?: Error;
    result?: NeedUpdateResult;
  }>({
    isLoading: enabled,
  });
  const skipped = useRef<string | undefined>(undefined);
  const run = useRef(0);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const id = ++run.current;
    const {
      skipStorage,
      skipStorageKey = "axonpack.in-app-updates.skip",
      ...rest
    } = latest.current;
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const stored =
        skipped.current ??
        (await skipStorage?.getItem(skipStorageKey)) ??
        undefined;
      const result = await needUpdate({
        skipVersion: stored,
        ...rest,
        ignoreErrors: false,
        // A foreground refresh should see a release made since the last check.
        forceUpdate: true,
      });
      if (mounted.current && id === run.current)
        setState({ isLoading: false, result });
    } catch (error) {
      if (mounted.current && id === run.current) {
        setState((s) => ({ ...s, isLoading: false, error: error as Error }));
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (!enabled) return undefined;
    void refresh();
    const subscription =
      latest.current.refreshOnForeground === false
        ? undefined
        : reactNative()?.AppState.addEventListener("change", (next) => {
            if (next === "active") void refresh();
          });
    return () => {
      mounted.current = false;
      subscription?.remove();
    };
  }, [enabled, refresh]);

  const skipVersion = useCallback(async () => {
    const version = state.result?.latestVersion;
    if (!version) return;
    skipped.current = version;
    const { skipStorage, skipStorageKey = "axonpack.in-app-updates.skip" } =
      latest.current;
    await skipStorage?.setItem(skipStorageKey, version);
    setState((s) =>
      s.result && !s.result.isForced
        ? { ...s, result: { ...s.result, isNeeded: false, isSkipped: true } }
        : s,
    );
  }, [state.result?.latestVersion]);

  const { result } = state;
  return {
    isLoading: state.isLoading,
    error: state.error,
    result,
    isNeeded: result?.isNeeded ?? false,
    isForced: result?.isForced ?? false,
    storeUrl: result?.storeUrl,
    latestVersion: result?.latestVersion,
    currentVersion: result?.currentVersion,
    releaseNotes: result?.releaseNotes,
    refresh,
    skipVersion,
    openStore: () => openStore({ storeUrl: result?.storeUrl || undefined }),
  };
};
