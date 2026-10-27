import {
  compatibilityKey,
  compatibilityOfKey,
  manifestKey,
  platformIndexKey,
} from "../core/layout";
import {
  PLUGIN_NAME,
  appVersionOf,
  compatibilityOf,
  resolveCompatibility,
} from "./expo-config";

// The config plugin is plain JS for Node; it carries its own copy of these rules.
const plugin = require("../../app.plugin.js");

test("app version is the default; the plugin option can choose fingerprint", () => {
  expect(compatibilityOf({ plugins: [PLUGIN_NAME] })).toBe("appVersion");
  expect(compatibilityOf({ plugins: [[PLUGIN_NAME, {}]] })).toBe("appVersion");
  expect(
    compatibilityOf({
      plugins: [[PLUGIN_NAME, { compatibility: "fingerprint" }]],
    }),
  ).toBe("fingerprint");
  expect(() =>
    compatibilityOf({ plugins: [[PLUGIN_NAME, { compatibility: "build" }]] }),
  ).toThrow('compatibility must be "appVersion" or "fingerprint"');
});

test("a platform's own version wins over the app version", () => {
  const config = { version: "1.0.0", ios: { version: "1.0.1" } };
  expect(appVersionOf(config, "ios")).toBe("1.0.1");
  expect(appVersionOf(config, "android")).toBe("1.0.0");
});

test("keys say which setting made them, and stay safe in a bucket path", () => {
  expect(compatibilityKey("appVersion", "1.0.0")).toBe("version-1.0.0");
  expect(compatibilityKey("fingerprint", "ab12")).toBe("fingerprint-ab12");
  expect(compatibilityKey("appVersion", "2.0 beta/1")).toBe(
    "version-2.0_beta_1",
  );
  expect(compatibilityOfKey("version-1.0.0")).toBe("appVersion");
  expect(compatibilityOfKey("fingerprint-ab12")).toBe("fingerprint");
  expect(platformIndexKey("android", "version-1.0.0")).toBe(
    "index/android/version-1.0.0.json",
  );
  expect(manifestKey("ios", "fingerprint-ab12", "task-1")).toBe(
    "previews/ios/fingerprint-ab12/task-1.json",
  );
});

test("the config plugin builds the same setting, version and key as the CLI", () => {
  for (const options of [
    undefined,
    {},
    { compatibility: "fingerprint" },
    { compatibility: "appVersion" },
  ]) {
    expect(plugin.compatibilityOf(options)).toBe(
      compatibilityOf({ plugins: [[PLUGIN_NAME, options]] }),
    );
  }
  const config = { version: "3.1.0", android: { version: "3.1.1" } };
  for (const platform of ["ios", "android"] as const) {
    expect(plugin.appVersionOf(config, platform)).toBe(
      appVersionOf(config, platform),
    );
  }
  for (const [mode, value] of [
    ["appVersion", "1.0.0"],
    ["appVersion", "2.0 beta/1"],
    ["fingerprint", "ab12"],
  ] as const) {
    expect(plugin.compatibilityKey(mode, value)).toBe(
      compatibilityKey(mode, value),
    );
  }
});

test("a flag that disagrees with the app config is used, with a warning", () => {
  expect(resolveCompatibility("fingerprint", undefined)).toEqual({
    compatibility: "fingerprint",
    warnings: [],
  });
  const overridden = resolveCompatibility("fingerprint", "appVersion");
  expect(overridden.compatibility).toBe("appVersion");
  expect(overridden.warnings[0]).toMatch(/differs from the app config/);
  expect(overridden.warnings[1]).toMatch(
    /native change without a version bump is not detected/,
  );
  expect(() => resolveCompatibility("appVersion", "nope")).toThrow(
    "--compatibility must be",
  );
});
