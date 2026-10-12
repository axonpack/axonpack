import { clearCache } from "./cache";
import { getLatestVersion } from "./get-latest-version";
import { getAppStoreUrl, getPlayStoreUrl, getStoreUrl } from "./get-store-url";
import { needUpdate } from "./need-update";
import { openStore } from "./open-store";
import { getVersionInfo, setVersionInfo } from "./source";
import type { VersionInfoSource } from "./types";

export * from "./errors";
export * from "./semver";
export { setMockVersion, isDev } from "./mock";
export type { MockVersion } from "./mock";
export {
  completeNativeUpdate,
  getNativeUpdateInfo,
  isNativeUpdateSupported,
  startNativeUpdate,
  INSTALL_STATUS_DOWNLOADED,
} from "./native-update";
export type {
  NativeInstallStatus,
  NativeUpdateInfo,
  NativeUpdateOutcome,
} from "./native-update";
export { checkOtaUpdate, applyOtaUpdate } from "./ota";
export { UpdatePrompt, DefaultUpdateModal } from "./prompt/update-prompt";
export type {
  UpdatePromptProps,
  UpdateModalProps,
  UpdateModalTheme,
  UpdateModalLabels,
} from "./prompt/types";
export * from "./types";
export * as providers from "./providers";
export { appStore, playStore, jsonProvider, chain } from "./providers";
export { clearCache } from "./cache";
export { detectCountry, setVersionInfo, createDefaultSource } from "./source";
export { evaluateUpdate, needUpdate } from "./need-update";
export { getLatestVersion } from "./get-latest-version";
export { getAppStoreUrl, getPlayStoreUrl, getStoreUrl } from "./get-store-url";
export { openStore } from "./open-store";
export { useVersionCheck } from "./use-version-check";
export type {
  SkipStorage,
  UseVersionCheckOptions,
  UseVersionCheckState,
} from "./use-version-check";

/**
 * The default export. Pass a source to use your own version info; without one, expo-application
 * is used on first call.
 */
export const createVersionCheck = (source?: VersionInfoSource) => {
  if (source) setVersionInfo(source);
  return {
    getCountry: async () => getVersionInfo().getCountry(),
    getPackageName: () => getVersionInfo().getPackageName(),
    getCurrentBuildNumber: () => getVersionInfo().getCurrentBuildNumber(),
    getCurrentVersion: () => getVersionInfo().getCurrentVersion(),
    getStoreUrl,
    getAppStoreUrl,
    getPlayStoreUrl,
    getLatestVersion,
    needUpdate,
    openStore,
    clearCache,
  };
};

const VersionCheck = createVersionCheck();
export default VersionCheck;
