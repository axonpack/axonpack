// Bakes each platform's native fingerprint into the app at prebuild, so the app can ask the bucket
// for exactly the previews made for its own native build. `preview-ready publish` computes the same
// value with the same tool, from the app's own `expo`.
const { createRequire } = require("node:module");
const { join } = require("node:path");
const {
  AndroidConfig,
  createRunOncePlugin,
  withAndroidManifest,
  withInfoPlist,
} = require("expo/config-plugins");

const pkg = require("./package.json");

const INFO_PLIST_KEY = "AxonpackPreviewReadyFingerprint";
const ANDROID_META_DATA = "dev.axonpack.preview-ready.FINGERPRINT";

async function fingerprintOf(projectRoot, platform) {
  const expo = createRequire(join(projectRoot, "package.json")).resolve("expo/package.json");
  const { createFingerprintAsync } = createRequire(expo)("@expo/fingerprint");
  const { hash } = await createFingerprintAsync(projectRoot, { platforms: [platform], silent: true });
  return hash;
}

/**
 * Options: `{ fingerprint: { ios, android } }` sets the value instead of computing it, for a
 * project whose own build computes its fingerprint some other way.
 */
const withPreviewReady = (config, options = {}) => {
  config = withInfoPlist(config, async (mod) => {
    mod.modResults[INFO_PLIST_KEY] =
      options.fingerprint?.ios ?? (await fingerprintOf(mod.modRequest.projectRoot, "ios"));
    return mod;
  });
  config = withAndroidManifest(config, async (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      application,
      ANDROID_META_DATA,
      options.fingerprint?.android ?? (await fingerprintOf(mod.modRequest.projectRoot, "android")),
    );
    return mod;
  });
  return config;
};

module.exports = createRunOncePlugin(withPreviewReady, pkg.name, pkg.version);
