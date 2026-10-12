import { baseInfo, fake } from "../native-fake.test-helper";
import { clearCache } from "../cache";
import { needUpdate } from "../need-update";
import { setVersionInfo } from "../source";
import { playStore } from "./play-store";

const page =
  '<html><div>Current Version</div><span class="x">1.0.0</span></html>';

const fakeFetch = (async () => new Response(page)) as unknown as typeof fetch;
const options = {
  packageName: "com.example.app",
  fetch: fakeFetch,
  retries: 0,
};

const installed = (build: number | string | undefined) =>
  setVersionInfo({
    getCountry: () => "US",
    getPackageName: () => "com.example.app",
    getCurrentBuildNumber: () => build,
    getCurrentVersion: () => "1.0.0",
  });

beforeEach(() => {
  fake.reset();
  clearCache();
  installed(10);
});

describe("the Play version code", () => {
  test("is reported as the build number when Play offers an update", async () => {
    fake.info = { ...baseInfo, available: true, availableVersionCode: 20 };
    expect(await playStore.getVersion(options)).toMatchObject({
      version: "1.0.0",
      buildNumber: 20,
    });
  });

  test("is left out when Play has no update for this user", async () => {
    fake.info = { ...baseInfo, available: false, availableVersionCode: 20 };
    expect((await playStore.getVersion(options)).buildNumber).toBeUndefined();
  });

  test("is left out when Play cannot answer, as on a sideloaded build", async () => {
    fake.infoError = true;
    const result = await playStore.getVersion(options);
    expect(result).toMatchObject({ version: "1.0.0" });
    expect(result.buildNumber).toBeUndefined();
  });

  test("is not asked for when the Android module is missing", async () => {
    fake.supported = false;
    expect((await playStore.getVersion(options)).buildNumber).toBeUndefined();
    expect(fake.calls).toEqual([]);
  });

  test("is not waited for longer than the timeout", async () => {
    fake.infoHangs = true;
    const result = await playStore.getVersion({ ...options, timeoutMs: 30 });
    expect(result).toMatchObject({
      version: "1.0.0",
      storeUrl: expect.any(String),
    });
    expect(result.buildNumber).toBeUndefined();
  });

  test("is not asked for once the check was aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    // The request itself would fail first, so this only checks the provider helper's own guard.
    await expect(
      playStore.getVersion({ ...options, signal: controller.signal }),
    ).rejects.toBeDefined();
    expect(fake.calls).toEqual([]);
  });
});

describe("a new Android build with the same version name", () => {
  const check = () =>
    needUpdate({
      provider: "playStore",
      platform: "android",
      ...options,
      ignoreErrors: false,
    });

  test("is an update of type build, with both build numbers in the result", async () => {
    fake.info = { ...baseInfo, available: true, availableVersionCode: 20 };
    expect(await check()).toMatchObject({
      isNeeded: true,
      updateType: "build",
      currentVersion: "1.0.0",
      latestVersion: "1.0.0",
      currentBuildNumber: 10,
      latestBuildNumber: 20,
    });
  });

  test("works when the installed build is a string", async () => {
    installed("10");
    fake.info = { ...baseInfo, available: true, availableVersionCode: 20 };
    expect((await check()).updateType).toBe("build");
  });

  test('compares real-looking values: installed "10" from the source, Play code 25', async () => {
    installed("10");
    fake.info = { ...baseInfo, available: true, availableVersionCode: 25 };
    expect(await check()).toMatchObject({
      updateType: "build",
      currentBuildNumber: 10,
      latestBuildNumber: 25,
    });
  });

  test("is not an update when the offered code is the same", async () => {
    fake.info = { ...baseInfo, available: true, availableVersionCode: 10 };
    expect((await check()).isNeeded).toBe(false);
  });

  test("is not an update when the offered code is lower", async () => {
    fake.info = { ...baseInfo, available: true, availableVersionCode: 5 };
    expect((await check()).isNeeded).toBe(false);
  });

  test("leaves the normal answer alone when the native call fails", async () => {
    fake.infoError = true;
    expect(await check()).toMatchObject({
      isNeeded: false,
      updateType: "none",
      latestVersion: "1.0.0",
    });
  });

  test("leaves the normal answer alone when the module is missing", async () => {
    fake.supported = false;
    expect((await check()).isNeeded).toBe(false);
  });

  test("a newer version name still wins, whatever the code says", async () => {
    fake.info = { ...baseInfo, available: true, availableVersionCode: 5 };
    const newer = (async () =>
      new Response(
        "<div>Current Version</div><span>2.0.0</span>",
      )) as unknown as typeof fetch;
    const result = await needUpdate({
      provider: "playStore",
      platform: "android",
      packageName: "com.example.app",
      fetch: newer,
      retries: 0,
      ignoreErrors: false,
    });
    expect(result).toMatchObject({ isNeeded: true, updateType: "major" });
    expect(result.latestBuildNumber).toBeUndefined();
  });
});
