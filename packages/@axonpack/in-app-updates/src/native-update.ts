import { optionalRequire } from "./runtime";

/** What Google Play knows about the app. Values are Play Core's own. */
export type NativeUpdateInfo = {
  available: boolean;
  /** An immediate update the user started and left. Call startNativeUpdate('immediate') to resume it. */
  inProgress: boolean;
  availableVersionCode: number;
  /** 0 to 5, set in the Play Developer API. 0 is the default. */
  updatePriority: number;
  /** Days since Play first knew about this update. Null when unknown. */
  stalenessDays: number | null;
  /** Play Core InstallStatus: 2 pending, 3 downloading, 11 downloaded, 4 installed, 5 failed. */
  installStatus: number;
  flexibleAllowed: boolean;
  immediateAllowed: boolean;
};

export type NativeInstallStatus = {
  status: number;
  bytesDownloaded: number;
  totalBytesToDownload: number;
  errorCode: number;
};

export const INSTALL_STATUS_DOWNLOADED = 11;

export type NativeUpdateOutcome =
  "accepted" | "declined" | "failed" | "unavailable";

type NativeModule = {
  getUpdateInfo: () => Promise<NativeUpdateInfo>;
  startUpdate: (immediate: boolean) => Promise<number>;
  completeUpdate: () => Promise<void>;
  addListener: (
    name: "onInstallStatus",
    listener: (event: NativeInstallStatus) => void,
  ) => { remove: () => void };
};

/** Undefined on iOS, in Expo Go, and in any build that did not link the module. */
const nativeModule = (): NativeModule | undefined => {
  const expo = optionalRequire(
    () =>
      require("expo") as {
        requireOptionalNativeModule?: <T>(name: string) => T | null;
      },
  );
  return (
    expo?.requireOptionalNativeModule?.<NativeModule>("AxonpackInAppUpdates") ??
    undefined
  );
};

export const isNativeUpdateSupported = (): boolean =>
  nativeModule() !== undefined;

/** Asks Google Play. Resolves undefined when the native module is missing, rejects when Play cannot answer. */
export const getNativeUpdateInfo = async (): Promise<
  NativeUpdateInfo | undefined
> => nativeModule()?.getUpdateInfo();

/**
 * Starts Play's in-app update. `flexible` downloads in the background while the app keeps running,
 * and reports progress to `onStatus`; call completeNativeUpdate() when it reports
 * INSTALL_STATUS_DOWNLOADED. `immediate` is a full-screen flow that restarts the app.
 * Resolves 'unavailable' when there is nothing to start, so callers can fall back to openStore().
 */
export const startNativeUpdate = async (
  kind: "flexible" | "immediate" = "flexible",
  onStatus?: (status: NativeInstallStatus) => void,
): Promise<NativeUpdateOutcome> => {
  const native = nativeModule();
  if (!native) return "unavailable";
  // Play cannot answer on a sideloaded build, an old Play Store, or a device without Play at all.
  const info = await native.getUpdateInfo().catch(() => undefined);
  if (!info) return "unavailable";
  const allowed =
    kind === "immediate" ? info.immediateAllowed : info.flexibleAllowed;
  if (!(info.available || info.inProgress) || !allowed) return "unavailable";

  const subscription = onStatus
    ? native.addListener("onInstallStatus", onStatus)
    : undefined;
  try {
    const code = await native.startUpdate(kind === "immediate");
    if (code === 0) return "declined";
    return code === -1 ? "accepted" : "failed";
  } finally {
    // An immediate update owns the screen until it ends, so nothing is left to report on.
    if (kind === "immediate") subscription?.remove();
  }
};

/** Installs a downloaded flexible update. The app restarts. */
export const completeNativeUpdate = async (): Promise<void> =>
  nativeModule()?.completeUpdate();
