import { NotFoundError } from "./errors";
import { guard } from "./get-latest-version";
import { resolvePlatform } from "./resolve";
import { getVersionInfo } from "./source";
import { appStoreUrl, lookupAppId } from "./providers/app-store";
import { playStoreUrl } from "./providers/play-store";
import type {
  GetAppStoreUrlOption,
  GetPlayStoreUrlOption,
  GetStoreUrlOption,
} from "./types";

export function getPlayStoreUrl(
  option: GetPlayStoreUrlOption & { ignoreErrors: false },
): Promise<string>;
export function getPlayStoreUrl(
  option?: GetPlayStoreUrlOption,
): Promise<string | undefined>;
export function getPlayStoreUrl(option: GetPlayStoreUrlOption = {}) {
  return guard(option.ignoreErrors, async () => {
    const packageName = option.packageName ?? getVersionInfo().getPackageName();
    if (!packageName) throw new NotFoundError("packageName is empty.");
    return playStoreUrl(packageName);
  });
}

/** `appID` is optional: it is looked up from the bundle id. */
export function getAppStoreUrl(
  option: GetAppStoreUrlOption & { ignoreErrors: false },
): Promise<string>;
export function getAppStoreUrl(
  option?: GetAppStoreUrlOption,
): Promise<string | undefined>;
export function getAppStoreUrl(option: GetAppStoreUrlOption = {}) {
  return guard(option.ignoreErrors, async () => {
    const info = getVersionInfo();
    const country = option.country ?? (await info.getCountry());
    let appID = option.appID;
    if (!appID) {
      appID = await lookupAppId({
        ...option,
        country,
        packageName: option.packageName ?? info.getPackageName(),
      });
    }
    if (!appID)
      throw new NotFoundError("appID is empty and could not be looked up.");
    return appStoreUrl(appID, country);
  });
}

export function getStoreUrl(
  option: GetStoreUrlOption & { ignoreErrors: false },
): Promise<string>;
export function getStoreUrl(
  option?: GetStoreUrlOption,
): Promise<string | undefined>;
export function getStoreUrl(option: GetStoreUrlOption = {}) {
  return guard(option.ignoreErrors, async () => {
    const strict = { ...option, ignoreErrors: false as const };
    return resolvePlatform(option.platform) === "ios"
      ? getAppStoreUrl(strict)
      : getPlayStoreUrl(strict);
  });
}
