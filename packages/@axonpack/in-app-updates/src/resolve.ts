import { InvalidProviderError, UnsupportedPlatformError } from "./errors";
import { currentPlatform, isStorePlatform } from "./runtime";
import { getVersionInfo } from "./source";
import { appStore } from "./providers/app-store";
import { playStore } from "./providers/play-store";
import type {
  GetLatestVersionOption,
  Platform,
  Provider,
  ProviderContext,
  ProviderOption,
  ProviderResult,
} from "./types";

export const resolvePlatform = (platform?: Platform): Platform => {
  const value = platform ?? currentPlatform();
  if (!isStorePlatform(value)) throw new UnsupportedPlatformError(value);
  return value;
};

const toProvider = (
  option: ProviderOption | undefined,
  platform: () => Platform,
): Provider => {
  const choice = option ?? (platform() === "ios" ? "appStore" : "playStore");
  if (choice === "appStore") return appStore;
  if (choice === "playStore") return playStore;
  if (typeof choice === "function") {
    return {
      getVersion: async (context) => {
        const out = await choice(context);
        return typeof out === "string" ? { version: out } : out;
      },
    };
  }
  if (choice && typeof choice.getVersion === "function") return choice;
  throw new InvalidProviderError(choice);
};

export const providerKey = (option: ProviderOption | undefined): string =>
  typeof option === "string" || option === undefined
    ? (option ?? "default")
    : "custom";

/** Fills in what the app knows about itself, then asks the provider. */
export const runProvider = async (
  option: GetLatestVersionOption,
): Promise<ProviderResult> => {
  let platformValue: Platform | undefined;
  // A custom provider does not care about the platform, so only the default and store ones resolve it.
  const platform = () => (platformValue ??= resolvePlatform(option.platform));
  const provider = toProvider(option.provider, platform);
  const info = getVersionInfo();

  const context: ProviderContext = {
    ...option,
    platform:
      option.platform ??
      (isStorePlatform(currentPlatform())
        ? (currentPlatform() as Platform)
        : undefined),
    country: option.country ?? (await info.getCountry()),
    packageName: option.packageName ?? info.getPackageName(),
    currentVersion: info.getCurrentVersion(),
  };
  return provider.getVersion(context);
};
