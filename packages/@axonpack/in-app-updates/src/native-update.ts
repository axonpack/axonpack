import { VersionInfoUnavailableError } from "./errors";
import { isDev } from "./mock";

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
  /** Play Core InstallStatus: 1 pending, 2 downloading, 3 installing, 4 installed, 5 failed, 6 canceled, 11 downloaded. */
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

/** A flexible update has finished downloading. completeNativeUpdate() installs it and restarts the app. */
export const INSTALL_STATUS_DOWNLOADED = 11;
const FINISHED = [4, 5, 6]; // installed, failed, canceled

export type NativeUpdateOutcome =
  "accepted" | "declined" | "failed" | "unavailable";

/** The cases the fake Play can play. See setNativeUpdateFake(). */
export type NativeFakeScenario =
  | "flexibleAccepted"
  | "immediateAccepted"
  | "declined"
  | "failed"
  | "unavailable"
  | "inProgress"
  | "downloadedOnLaunch";

type NativeModule = {
  getUpdateInfo: () => Promise<NativeUpdateInfo>;
  startUpdate: (immediate: boolean) => Promise<number>;
  completeUpdate: () => Promise<void>;
  setFakeScenario: (scenario: NativeFakeScenario | null) => Promise<void>;
  addListener: (
    name: "onInstallStatus",
    listener: (event: NativeInstallStatus) => void,
  ) => { remove: () => void };
};

/** Undefined on iOS, in Expo Go, and in any build that did not link the module. */
const nativeModule = (): NativeModule | undefined => {
  // The literal require sits directly inside a try, so Metro treats it as optional.
  let expo:
    { requireOptionalNativeModule?: <T>(name: string) => T | null } | undefined;
  try {
    expo = require("expo");
  } catch {
    expo = undefined;
  }
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

let subscription: { remove: () => void } | undefined;
let running: Promise<NativeUpdateOutcome> | undefined;
// Play marks a running flexible download as "in progress" too, so a download this session started
// must not be mistaken for an immediate update the user left.
let flexibleInFlight = false;

/** For tests: forgets what this session knows. Not exported from the package. */
export const resetNativeUpdateState = () => {
  stopListening();
  running = undefined;
  flexibleInFlight = false;
};

const stopListening = () => {
  subscription?.remove();
  subscription = undefined;
};

/**
 * Starts Play's in-app update. `flexible`: Play shows its own consent dialog, then downloads in the
 * background while the app keeps running. It reports progress to `onStatus`; call
 * completeNativeUpdate() when it reports INSTALL_STATUS_DOWNLOADED, which restarts the app.
 * `immediate`: Play shows its own full-screen update screen over the app, then restarts it.
 * Play only starts when it offers the update to this user. Otherwise this resolves 'unavailable',
 * and callers can fall back to openStore(), which leaves the app.
 *
 * A second call while one is running returns the first call's result.
 */
export const startNativeUpdate = (
  kind: "flexible" | "immediate" = "flexible",
  onStatus?: (status: NativeInstallStatus) => void,
): Promise<NativeUpdateOutcome> => {
  running ??= run(kind, onStatus).finally(() => {
    running = undefined;
  });
  return running;
};

const run = async (
  kind: "flexible" | "immediate",
  onStatus?: (status: NativeInstallStatus) => void,
): Promise<NativeUpdateOutcome> => {
  const native = nativeModule();
  if (!native) return "unavailable";
  // Play cannot answer on a sideloaded build, an old Play Store, or a device without Play at all.
  const info = await native.getUpdateInfo().catch(() => undefined);
  if (!info) return "unavailable";
  const resuming = kind === "immediate" && info.inProgress;
  const allowed =
    kind === "immediate" ? info.immediateAllowed : info.flexibleAllowed;
  if (!(info.available || info.inProgress)) return "unavailable";
  // An update that is already running reports itself as not allowed, and Google's guide resumes it
  // anyway, so only a fresh start is checked.
  if (!resuming && !allowed) return "unavailable";

  stopListening();
  // Always listening, so the end of a flexible update is noticed even when the caller does not care.
  subscription = native.addListener("onInstallStatus", (status) => {
    onStatus?.(status);
    if (
      status.status === INSTALL_STATUS_DOWNLOADED ||
      FINISHED.includes(status.status)
    ) {
      flexibleInFlight = false;
    }
    // The last word on a flexible update. Nothing more will arrive, so stop listening.
    if (FINISHED.includes(status.status)) stopListening();
  });
  try {
    const code = await native.startUpdate(kind === "immediate");
    if (code !== -1) {
      // Declined or failed: no download follows, so nothing is left to listen for.
      stopListening();
      return code === 0 ? "declined" : "failed";
    }
    flexibleInFlight = kind === "flexible";
    return "accepted";
  } catch {
    stopListening();
    return "failed";
  } finally {
    // An immediate update owns the screen until it ends, so there is nothing to report on.
    if (kind === "immediate") stopListening();
  }
};

/** Installs a downloaded flexible update. The app restarts. */
export const completeNativeUpdate = async (): Promise<void> =>
  nativeModule()?.completeUpdate();

/**
 * What to do about an update that a past run of the app left behind. Check it when the app starts and
 * each time it returns to the foreground, as Google's guide asks.
 *
 * - `in-progress`: an immediate update was started and left. Resume it with startNativeUpdate('immediate').
 * - `downloaded`: a flexible update finished downloading, maybe while the app was closed. Install it
 *   with completeNativeUpdate().
 */
export const getNativeUpdateState = async (): Promise<
  "in-progress" | "downloaded" | "none"
> => {
  const info = await getNativeUpdateInfo().catch(() => undefined);
  // Play also calls a downloaded flexible update "in progress", so a finished download comes first.
  if (info?.installStatus === INSTALL_STATUS_DOWNLOADED) return "downloaded";
  if (info?.inProgress && !flexibleInFlight) return "in-progress";
  return "none";
};

/**
 * Development only. Turns on a fake Google Play so the whole flow runs without Play: the consent
 * answer, the download progress, the install. Pass null to turn it off.
 *
 * It works only in a debuggable Android build and only when `__DEV__` is true. A release build
 * refuses it, so it cannot be turned on for users.
 */
export const setNativeUpdateFake = async (
  scenario: NativeFakeScenario | null,
): Promise<void> => {
  if (!isDev()) {
    throw new VersionInfoUnavailableError(
      "The fake Play only works when __DEV__ is true.",
    );
  }
  const native = nativeModule();
  if (!native) {
    throw new VersionInfoUnavailableError(
      "The Play update module is not linked.",
    );
  }
  await native.setFakeScenario(scenario);
};
