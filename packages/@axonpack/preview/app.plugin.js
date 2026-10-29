// Bakes the build's compatibility setting and key into the app at prebuild, so the app asks the
// bucket for exactly the previews made for its own native build. `preview publish` reads the
// same option from the same app config and builds the same key, so the two cannot disagree.
//
//   plugins: [["@axonpack/preview", { compatibility: "appVersion" | "fingerprint" }]]
//
// appVersion (the default) keys on the app version; fingerprint on the native fingerprint.
const { createRequire } = require("node:module");
const { join } = require("node:path");
const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withInfoPlist,
} = require("expo/config-plugins");

const pkg = require("./package.json");

const PLIST = {
  compatibility: "AxonpackPreviewCompatibility",
  key: "AxonpackPreviewKey",
  slug: "AxonpackPreviewSlug",
};
const META = {
  compatibility: "dev.axonpack.preview.COMPATIBILITY",
  key: "dev.axonpack.preview.KEY",
  slug: "dev.axonpack.preview.SLUG",
};

// Kept in step with src/utils/previews/layout.util.ts and src/utils/config/expo-config.util.ts by a test.
const compatibilityOf = (options) => {
  const value = options?.compatibility ?? "appVersion";
  if (value !== "appVersion" && value !== "fingerprint") {
    throw new Error(
      `${pkg.name}: compatibility must be "appVersion" or "fingerprint"`,
    );
  }
  return value;
};
const appVersionOf = (config, platform) =>
  String(config[platform]?.version ?? config.version ?? "");
const compatibilityKey = (compatibility, value) =>
  `${compatibility === "appVersion" ? "version" : "fingerprint"}-${String(value).replace(/[^A-Za-z0-9._-]/g, "_")}`;

async function fingerprintOf(projectRoot, platform) {
  const expo = createRequire(join(projectRoot, "package.json")).resolve(
    "expo/package.json",
  );
  const { createFingerprintAsync } = createRequire(expo)("@expo/fingerprint");
  const { hash } = await createFingerprintAsync(projectRoot, {
    platforms: [platform],
    silent: true,
  });
  return hash;
}

async function keyFor(config, projectRoot, platform, compatibility) {
  const value =
    compatibility === "appVersion"
      ? appVersionOf(config, platform)
      : await fingerprintOf(projectRoot, platform);
  return compatibilityKey(compatibility, value);
}

const withPreview = (config, options = {}) => {
  const compatibility = compatibilityOf(options);
  config = withInfoPlist(config, async (mod) => {
    mod.modResults[PLIST.compatibility] = compatibility;
    mod.modResults[PLIST.key] = await keyFor(
      mod,
      mod.modRequest.projectRoot,
      "ios",
      compatibility,
    );
    // Tells this app's local Metro servers apart from other projects' (notes/dev-preview-servers.md).
    mod.modResults[PLIST.slug] = mod.slug;
    return mod;
  });
  config = withAndroidManifest(config, async (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      mod.modResults,
    );
    const key = await keyFor(
      mod,
      mod.modRequest.projectRoot,
      "android",
      compatibility,
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      application,
      META.compatibility,
      compatibility,
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      application,
      META.key,
      key,
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      application,
      META.slug,
      mod.slug,
    );
    return mod;
  });
  return config;
};

module.exports = createRunOncePlugin(withPreview, pkg.name, pkg.version);
module.exports.compatibilityOf = compatibilityOf;
module.exports.appVersionOf = appVersionOf;
module.exports.compatibilityKey = compatibilityKey;
