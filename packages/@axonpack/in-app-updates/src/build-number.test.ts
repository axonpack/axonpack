import { clearCache } from "./cache";
import { evaluateUpdate, needUpdate } from "./need-update";
import { jsonProvider } from "./providers";
import { setVersionInfo } from "./source";

// A build number only matters when the store and the app report the same version.
const same = { version: "1.0.0" };

const source = (build: number | string | undefined, version = "1.0.0") =>
  setVersionInfo({
    getCountry: () => "US",
    getPackageName: () => "com.example.app",
    getCurrentBuildNumber: () => build,
    getCurrentVersion: () => version,
  });

beforeEach(() => {
  clearCache();
  source(undefined);
});

describe("same version, different build", () => {
  test("a higher store build is an update of type build", () => {
    expect(
      evaluateUpdate(
        "1.0.0",
        { ...same, buildNumber: 9 },
        { currentBuildNumber: 5 },
      ),
    ).toMatchObject({
      isNeeded: true,
      updateType: "build",
    });
  });

  test("an equal build is not an update", () => {
    expect(
      evaluateUpdate(
        "1.0.0",
        { ...same, buildNumber: 5 },
        { currentBuildNumber: 5 },
      ),
    ).toMatchObject({
      isNeeded: false,
      updateType: "none",
    });
  });

  test("a lower store build is not an update", () => {
    expect(
      evaluateUpdate(
        "1.0.0",
        { ...same, buildNumber: 3 },
        { currentBuildNumber: 5 },
      ).isNeeded,
    ).toBe(false);
  });

  test("a store that reports no build is not an update", () => {
    expect(
      evaluateUpdate("1.0.0", same, { currentBuildNumber: 5 }).isNeeded,
    ).toBe(false);
  });

  test("an app that reports no build is not an update", () => {
    source(undefined);
    expect(evaluateUpdate("1.0.0", { ...same, buildNumber: 9 }).isNeeded).toBe(
      false,
    );
  });

  test("build 0 counts as a build, not as missing", () => {
    expect(
      evaluateUpdate(
        "1.0.0",
        { ...same, buildNumber: 1 },
        { currentBuildNumber: 0 },
      ).isNeeded,
    ).toBe(true);
    expect(
      evaluateUpdate(
        "1.0.0",
        { ...same, buildNumber: 0 },
        { currentBuildNumber: 0 },
      ).isNeeded,
    ).toBe(false);
  });
});

describe("a different version", () => {
  test("a higher version with a lower build is still an update", () => {
    expect(
      evaluateUpdate(
        "1.0.0",
        { version: "2.0.0", buildNumber: 1 },
        { currentBuildNumber: 50 },
      ),
    ).toMatchObject({ isNeeded: true, updateType: "major" });
  });

  test("a lower version with a higher build is not an update", () => {
    expect(
      evaluateUpdate(
        "2.0.0",
        { version: "1.0.0", buildNumber: 99 },
        { currentBuildNumber: 1 },
      ).isNeeded,
    ).toBe(false);
  });
});

describe("where the numbers come from", () => {
  test("the app's build comes from the version source when no option is given", () => {
    source(5);
    expect(
      evaluateUpdate("1.0.0", { ...same, buildNumber: 9 }).updateType,
    ).toBe("build");
  });

  test("an Android build is a number and an iOS build is a string, and both compare", () => {
    source(5);
    expect(evaluateUpdate("1.0.0", { ...same, buildNumber: 9 }).isNeeded).toBe(
      true,
    );
    source("5");
    expect(evaluateUpdate("1.0.0", { ...same, buildNumber: 9 }).isNeeded).toBe(
      true,
    );
    source("12");
    expect(
      evaluateUpdate("1.0.0", { ...same, buildNumber: "9" }).isNeeded,
    ).toBe(false);
  });

  test("the currentBuildNumber option beats the version source", () => {
    source(100);
    expect(
      evaluateUpdate(
        "1.0.0",
        { ...same, buildNumber: 9 },
        { currentBuildNumber: 5 },
      ).isNeeded,
    ).toBe(true);
  });

  test("the latestBuildNumber option beats what the provider reports", () => {
    expect(
      evaluateUpdate(
        "1.0.0",
        { ...same, buildNumber: 1 },
        { currentBuildNumber: 5, latestBuildNumber: 9 },
      ).isNeeded,
    ).toBe(true);
  });

  test("needUpdate takes both numbers from options, with no store", async () => {
    source(5);
    const result = await needUpdate({
      latestVersion: "1.0.0",
      latestBuildNumber: 9,
      ignoreErrors: false,
    });
    expect(result).toMatchObject({
      isNeeded: true,
      updateType: "build",
      currentVersion: "1.0.0",
    });
  });

  test("needUpdate reads a string build from the version source", async () => {
    source("5");
    const result = await needUpdate({
      latestVersion: "1.0.0",
      latestBuildNumber: 9,
      ignoreErrors: false,
    });
    expect(result.updateType).toBe("build");
  });
});

describe("the JSON provider", () => {
  const withJson = (body: unknown) =>
    needUpdate({
      provider: jsonProvider({ url: "https://x.test/v.json" }),
      fetch: (async () =>
        new Response(JSON.stringify(body))) as unknown as typeof fetch,
      currentBuildNumber: 5,
      ignoreErrors: false,
      retries: 0,
    });

  test("reads buildNumber", async () => {
    expect(
      await withJson({ latestVersion: "1.0.0", buildNumber: 9 }),
    ).toMatchObject({
      isNeeded: true,
      updateType: "build",
    });
  });

  test("reads latestBuildNumber", async () => {
    expect(
      await withJson({ latestVersion: "1.0.0", latestBuildNumber: 9 }),
    ).toMatchObject({
      isNeeded: true,
      updateType: "build",
    });
  });

  test("reads a platform key", async () => {
    source(5);
    const result = await needUpdate({
      provider: jsonProvider({ url: "https://x.test/v.json" }),
      platform: "android",
      fetch: (async () =>
        new Response(
          JSON.stringify({
            android: { latestVersion: "1.0.0", buildNumber: 9 },
          }),
        )) as unknown as typeof fetch,
      ignoreErrors: false,
      retries: 0,
    });
    expect(result.updateType).toBe("build");
  });

  test("an equal build from JSON is not an update", async () => {
    expect(
      (await withJson({ latestVersion: "1.0.0", buildNumber: 5 })).isNeeded,
    ).toBe(false);
  });
});

describe("builds that are not plain numbers", () => {
  test("only the leading number is read, so 42.1 counts as 42", () => {
    expect(
      evaluateUpdate(
        "1.0.0",
        { ...same, buildNumber: "43" },
        { currentBuildNumber: "42.1" },
      ).isNeeded,
    ).toBe(true);
    expect(
      evaluateUpdate(
        "1.0.0",
        { ...same, buildNumber: "42.9" },
        { currentBuildNumber: "42.1" },
      ).isNeeded,
    ).toBe(false);
  });

  test("a build with no leading number is ignored, so there is no update", () => {
    expect(
      evaluateUpdate(
        "1.0.0",
        { ...same, buildNumber: "build-9" },
        { currentBuildNumber: 5 },
      ).isNeeded,
    ).toBe(false);
    expect(
      evaluateUpdate(
        "1.0.0",
        { ...same, buildNumber: 9 },
        { currentBuildNumber: "build-5" },
      ).isNeeded,
    ).toBe(false);
  });

  test("an empty build is ignored", () => {
    expect(
      evaluateUpdate(
        "1.0.0",
        { ...same, buildNumber: "" },
        { currentBuildNumber: 5 },
      ).isNeeded,
    ).toBe(false);
  });
});

describe("with the rules around updates", () => {
  const build = { ...same, buildNumber: 9 };

  test("a build update can be skipped, like any soft update", () => {
    expect(
      evaluateUpdate("1.0.0", build, {
        currentBuildNumber: 5,
        skipVersion: "1.0.0",
      }),
    ).toMatchObject({
      isNeeded: false,
      isSkipped: true,
      updateType: "build",
    });
  });

  test("a build update is forced when required is true", () => {
    expect(
      evaluateUpdate("1.0.0", build, { currentBuildNumber: 5, required: true }),
    ).toMatchObject({
      isNeeded: true,
      isForced: true,
      canSkip: false,
    });
  });

  test("a build update is never big enough for required by size", () => {
    expect(
      evaluateUpdate("1.0.0", build, {
        currentBuildNumber: 5,
        required: "patch",
      }).isForced,
    ).toBe(false);
  });

  test("canSkip false keeps a skipVersion from muting a build update", () => {
    expect(
      evaluateUpdate("1.0.0", build, {
        currentBuildNumber: 5,
        skipVersion: "1.0.0",
        canSkip: false,
      }).isNeeded,
    ).toBe(true);
  });
});
