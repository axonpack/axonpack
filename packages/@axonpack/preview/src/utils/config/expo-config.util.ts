import {
  Compatibility,
  DEFAULT_COMPATIBILITY,
  Platform,
  isCompatibility,
} from "../previews/layout.util";

/** The parts of an Expo app config this package reads. */
export type AppConfig = {
  /** Always set by `getConfig`, from the name when the config has none. */
  slug?: string;
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

// A name is a folder in the app's documents and a part of every file's path, so it is kept to
// characters that are safe in both. A leading dot would allow "." and "..".
const FILE_SET_NAME = /^[A-Za-z0-9_-][A-Za-z0-9._-]*$/;

/** One file set from the plugin's `files` option, in its object form. */
export type FileSet = {
  /** Relative to the project root. */
  folder: string;
  /** A shell command `preview publish` runs from the project root before it reads the folder. */
  build?: string;
};

const nonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

/**
 * The `files` option of the plugin entry: each file set's name, folder (relative to the project
 * root) and build command, such as `{ www: "web/dist" }` or
 * `{ www: { folder: "web/dist", build: "npm run build:web" } }`. Empty without it.
 */
export function fileSetsOf(config: AppConfig): Record<string, FileSet> {
  const entry = config.plugins?.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === PLUGIN_NAME,
  );
  const files = Array.isArray(entry)
    ? (entry[1] as { files?: unknown } | undefined)?.files
    : undefined;
  if (files === undefined) return {};
  if (typeof files !== "object" || files === null || Array.isArray(files)) {
    throw new Error(
      `${PLUGIN_NAME}: files must name each file set and its folder, such as { "www": "web/dist" }`,
    );
  }
  const sets: Record<string, FileSet> = {};
  for (const [name, value] of Object.entries(files)) {
    if (!FILE_SET_NAME.test(name)) {
      throw new Error(
        `${PLUGIN_NAME}: "${name}" can't name a file set. Use letters, digits, ".", "_" and "-", not starting with a dot.`,
      );
    }
    const set = value as { folder?: unknown; build?: unknown } | null;
    if (nonEmpty(value)) sets[name] = { folder: value };
    else if (
      typeof set === "object" &&
      set !== null &&
      !Array.isArray(set) &&
      nonEmpty(set.folder) &&
      (set.build === undefined || nonEmpty(set.build))
    )
      sets[name] = {
        folder: set.folder,
        ...(set.build !== undefined && { build: set.build }),
      };
    else
      throw new Error(
        `${PLUGIN_NAME}: files.${name} must be a folder, such as "web/dist", or { "folder": "web/dist", "build": "<a command that builds it>" }`,
      );
  }
  return sets;
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
