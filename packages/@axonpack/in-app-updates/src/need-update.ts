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

// How big an update is, for the `required` rule. Prerelease and build updates are never "big".
const SIZE: Record<string, number> = { patch: 1, minor: 2, major: 3 };

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
  let currentBuild: number | undefined;
  if (
    !isUpdate &&
    latestBuild !== undefined &&
    compare(latest.version, currentVersion) === 0
  ) {
    const installed = toNumber(
      option.currentBuildNumber ?? getVersionInfo().getCurrentBuildNumber(),
    );
    if (installed !== undefined && latestBuild > installed) {
      isUpdate = true;
      updateType = "build";
      currentBuild = installed;
    }
  }

  const belowMinimum = minimumVersion
    ? compare(currentVersion, minimumVersion) < 0
    : false;
  const rule = option.required ?? latest.required ?? false;
  const size = typeof rule === "string" ? SIZE[rule] : 0;
  let isForced =
    belowMinimum ||
    (isUpdate &&
      (rule === true || (size > 0 && (SIZE[updateType] ?? 0) >= size)));

  const build = (forced: boolean): NeedUpdateResult => {
    const canSkip = !forced && option.canSkip !== false;
    const isSkipped =
      canSkip &&
      isUpdate &&
      !!skipVersion &&
      compare(skipVersion, latest.version) === 0;
    return {
      isNeeded: forced || (isUpdate && !isSkipped),
      storeUrl: latest.storeUrl ?? option.storeUrl ?? "",
      currentVersion,
      latestVersion: latest.version,
      isForced: forced,
      isSkipped,
      // Shown only for a new build of the same version, where the version alone says nothing.
      currentBuildNumber: updateType === "build" ? currentBuild : undefined,
      latestBuildNumber: updateType === "build" ? latestBuild : undefined,
      canSkip,
      updateType,
      minimumVersion,
      releaseNotes: latest.releaseNotes,
      releaseDate: latest.releaseDate,
    };
  };

  // A function rule sees the result as it stands without the rule, then can force it.
  if (!isForced && isUpdate && typeof rule === "function") {
    isForced = rule(build(false));
  }
  return build(isForced);
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
