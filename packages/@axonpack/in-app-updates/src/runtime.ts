import type { Platform } from "./types";

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

// The literal require sits directly inside a try, which is the only shape Metro treats as an
// optional dependency. Wrapping it in a helper makes the bundle fail when the module is absent.
export const reactNative = (): ReactNative | undefined => {
  try {
    return require("react-native") as ReactNative;
  } catch {
    return undefined;
  }
};

export const currentPlatform = (): string =>
  reactNative()?.Platform.OS ?? "unknown";

export const isStorePlatform = (value: string): value is Platform =>
  value === "ios" || value === "android";
