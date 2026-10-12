import { activeMock } from "./mock";
import { fetchLatest, guard } from "./get-latest-version";
import { VersionInfoUnavailableError } from "./errors";
import { compareVersions, diffVersions, truncateVersion } from "./semver";
import type { UpdateType } from "./semver";
import { getVersionInfo } from "./source";
import type {
  NeedUpdateOption,
  NeedUpdateResult,
  ProviderResult,
} from "./types";

const toNumber = (value: number | string | undefined): number | undefined => {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : value;
  return n === undefined || Number.isNaN(n) ? undefined : n;
};

/** The pure part of needUpdate: no network, no source. */
export const evaluateUpdate = (
  currentVersion: string,
  latest: ProviderResult,
  option: NeedUpdateOption = {},
): NeedUpdateResult => {
  const { depth = Infinity, skipVersion } = option;
  const minimumVersion = option.minimumVersion ?? latest.minimumVersion;

  const compare = option.compare ?? compareVersions;
  const view = (v: string) => (option.compare ? v : truncateVersion(v, depth));

  let isUpdate = compare(view(latest.version), view(currentVersion)) > 0;
  let updateType: UpdateType = "none";
  if (isUpdate) {
    try {
      updateType = diffVersions(currentVersion, latest.version);
    } catch {
      // A custom format the built-in parser cannot read: all we know is that it is newer.
      updateType = "patch";
    }
  }

  // Same version: a higher build number still counts, for providers that report one.
  // Only the same version with a newer build counts, so the device is asked for its build only then.
  const latestBuild = toNumber(option.latestBuildNumber ?? latest.buildNumber);
  if (
    !isUpdate &&
    latestBuild !== undefined &&
    compare(latest.version, currentVersion) === 0
  ) {
    const currentBuild = toNumber(
      option.currentBuildNumber ?? getVersionInfo().getCurrentBuildNumber(),
    );
    if (currentBuild !== undefined && latestBuild > currentBuild) {
      isUpdate = true;
      updateType = "build";
    }
  }

  const isForced = minimumVersion
    ? compare(currentVersion, minimumVersion) < 0
    : false;
  const isSkipped =
    !isForced &&
    isUpdate &&
    !!skipVersion &&
    compare(skipVersion, latest.version) === 0;

  return {
    isNeeded: isForced || (isUpdate && !isSkipped),
    storeUrl: latest.storeUrl ?? option.storeUrl ?? "",
    currentVersion,
    latestVersion: latest.version,
    isForced,
    isSkipped,
    updateType,
    minimumVersion,
    releaseNotes: latest.releaseNotes,
    releaseDate: latest.releaseDate,
  };
};

export function needUpdate(
  option: NeedUpdateOption & { ignoreErrors: false },
): Promise<NeedUpdateResult>;
export function needUpdate(
  option?: NeedUpdateOption,
): Promise<NeedUpdateResult | undefined>;
export function needUpdate(option: NeedUpdateOption = {}) {
  return guard(option.ignoreErrors, async () => {
    const currentVersion =
      activeMock(option)?.currentVersion ??
      option.currentVersion ??
      getVersionInfo().getCurrentVersion();
    if (!currentVersion) {
      throw new VersionInfoUnavailableError(
        "The current version is unknown (no source returned one).",
      );
    }
    const latest: ProviderResult = option.latestVersion
      ? { version: option.latestVersion }
      : await fetchLatest(option);
    return evaluateUpdate(currentVersion, latest, option);
  });
}
