import {
  Compatibility,
  DEFAULT_COMPATIBILITY,
  Platform,
  isCompatibility,
} from "../previews/layout.util";

/** The parts of an Expo app config this package reads. */
export type AppConfig = {
  version?: string;
  plugins?: (string | [string, unknown?])[];
  ios?: { version?: string; buildNumber?: string };
  android?: { version?: string; versionCode?: number };
};

export const PLUGIN_NAME = "@axonpack/preview";

/** The `compatibility` option of the plugin entry in the app config, or the default. */
export function compatibilityOf(config: AppConfig): Compatibility {
  for (const plugin of config.plugins ?? []) {
    if (Array.isArray(plugin) && plugin[0] === PLUGIN_NAME) {
      const option = (plugin[1] as { compatibility?: unknown } | undefined)
        ?.compatibility;
      if (option === undefined) break;
      if (!isCompatibility(option)) {
        throw new Error(
          `${PLUGIN_NAME}: compatibility must be "appVersion" or "fingerprint"`,
        );
      }
      return option;
    }
  }
  return DEFAULT_COMPATIBILITY;
}

/** The app version a platform's build reports: its own `version` when set, else `expo.version`. */
export const appVersionOf = (config: AppConfig, platform: Platform): string =>
  String(config[platform]?.version ?? config.version ?? "");

export const buildNumberOf = (config: AppConfig, platform: Platform): string =>
  String(
    (platform === "ios"
      ? config.ios?.buildNumber
      : config.android?.versionCode) ?? "",
  );

/**
 * The setting to publish with: the app config's, unless `--compatibility` overrides it. The
 * warnings say when the two disagree (the build would not see the previews) and what appVersion
 * mode cannot catch.
 */
export function resolveCompatibility(
  fromApp: Compatibility,
  flag: string | undefined,
): { compatibility: Compatibility; warnings: string[] } {
  if (flag !== undefined && !isCompatibility(flag)) {
    throw new Error(
      `--compatibility must be appVersion or fingerprint, not ${flag}`,
    );
  }
  const compatibility = flag ?? fromApp;
  const warnings: string[] = [];
  if (compatibility !== fromApp) {
    warnings.push(
      `--compatibility ${compatibility} differs from the app config (${fromApp}), so a build of this app will not list this preview.`,
    );
  }
  if (compatibility === "appVersion") {
    warnings.push(
      "Matched by app version: a native change without a version bump is not detected. Bump the version after native changes, or use fingerprint.",
    );
  }
  return { compatibility, warnings };
}
