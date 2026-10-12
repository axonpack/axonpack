import type { Platform } from "./types";

/**
 * Optional modules are required inside a function and a try block, so Metro treats them as
 * optional and a project without them still bundles.
 */
export const optionalRequire = <T>(load: () => T): T | undefined => {
  try {
    return load();
  } catch {
    return undefined;
  }
};

// Typed by hand so the package needs no react-native types to compile.
type ReactNative = {
  Platform: { OS: string };
  Linking: { openURL: (url: string) => Promise<unknown> };
  AppState: {
    addEventListener: (
      type: "change",
      listener: (state: string) => void,
    ) => { remove: () => void };
  };
};

export const reactNative = (): ReactNative | undefined =>
  optionalRequire(() => require("react-native") as ReactNative);

export const currentPlatform = (): string =>
  reactNative()?.Platform.OS ?? "unknown";

export const isStorePlatform = (value: string): value is Platform =>
  value === "ios" || value === "android";
