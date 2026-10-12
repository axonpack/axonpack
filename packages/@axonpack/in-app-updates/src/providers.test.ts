import { clearCache } from "./cache";
import { HttpError, NotFoundError, ParseError, TimeoutError } from "./errors";
import { getLatestVersion } from "./get-latest-version";
import { getStoreUrl } from "./get-store-url";
import { setMockVersion } from "./mock";
import { evaluateUpdate, needUpdate } from "./need-update";
import {
  appStore,
  chain,
  jsonProvider,
  parsePlayStorePage,
  playStore,
} from "./providers";
import { setVersionInfo } from "./source";

const calls: string[] = [];
let respond: (url: string) => Response | Promise<Response>;

const fakeFetch = (async (url: string) => {
  calls.push(url);
  return respond(url);
}) as unknown as typeof fetch;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

beforeEach(() => {
  calls.length = 0;
  clearCache();
  setMockVersion(undefined);
  setVersionInfo({
    getCountry: () => "DE",
    getPackageName: () => "com.example.app",
    getCurrentBuildNumber: () => 5,
    getCurrentVersion: () => "1.0.0",
  });
});
afterEach(() => {
  // jest-expo turns __DEV__ on, so tests that need it off say so.
  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
});

const base = { fetch: fakeFetch, retryDelayMs: 0 };

test("appStore reads version, store url and notes, and uses the device storefront", async () => {
  respond = () =>
    json({
      resultCount: 1,
      results: [{ version: "2.1.0", trackId: 42, releaseNotes: "Fixes" }],
    });
  const result = await appStore.getVersion({
    ...base,
    country: "DE",
    packageName: "com.example.app",
  });
  expect(result).toMatchObject({
    version: "2.1.0",
    releaseNotes: "Fixes",
    storeUrl: "itms-apps://apps.apple.com/de/app/id42",
  });
  expect(calls[0]).toContain("bundleId=com.example.app");
  expect(calls[0]).toContain("country=de");
});

test("appStore falls back to the us storefront when the app is not listed locally", async () => {
  respond = (url) =>
    url.includes("country=de")
      ? json({ resultCount: 0, results: [] })
      : json({ resultCount: 1, results: [{ version: "3.0.0", trackId: 1 }] });
  const result = await appStore.getVersion({
    ...base,
    country: "DE",
    packageName: "a.b",
  });
  expect(result.version).toBe("3.0.0");
  expect(calls).toHaveLength(2);
});

test("appStore throws NotFoundError when no storefront lists the app", async () => {
  respond = () => json({ resultCount: 0, results: [] });
  await expect(
    appStore.getVersion({ ...base, country: "DE", packageName: "a.b" }),
  ).rejects.toBeInstanceOf(NotFoundError);
});

test("Play page parser handles old layout, new layout and structured data", () => {
  expect(
    parsePlayStorePage(
      '<div>Current Version</div><span class="x">1.4.2</span>',
    ),
  ).toBe("1.4.2");
  expect(parsePlayStorePage('..[[["2.0.1"]],[[[...')).toBe("2.0.1");
  expect(parsePlayStorePage('{"softwareVersion":"3.1.0-beta"}')).toBe(
    "3.1.0-beta",
  );
  expect(parsePlayStorePage("<html>Varies with device</html>")).toBeUndefined();
});

test("playStore throws ParseError on an unreadable page", async () => {
  respond = () => new Response("<html>Varies with device</html>");
  await expect(
    playStore.getVersion({ ...base, packageName: "a.b" }),
  ).rejects.toBeInstanceOf(ParseError);
});

test("jsonProvider reads the platform key and maps fields", async () => {
  respond = () =>
    json({
      ios: {
        latestVersion: "4.0.0",
        minimumVersion: "3.0.0",
        releaseNotes: "n",
      },
      android: { latestVersion: "9.9.9" },
    });
  const result = await jsonProvider({
    url: "https://x.test/v.json",
  }).getVersion({ ...base, platform: "ios" });
  expect(result).toMatchObject({
    version: "4.0.0",
    minimumVersion: "3.0.0",
    releaseNotes: "n",
  });
});

test("jsonProvider accepts a custom parse", async () => {
  respond = () =>
    json({ parameters: { v: { defaultValue: { value: "5.0.0" } } } });
  const provider = jsonProvider({
    url: "https://x.test",
    parse: (j) => ({ version: j.parameters.v.defaultValue.value }),
  });
  expect((await provider.getVersion(base)).version).toBe("5.0.0");
});

test("chain falls through to the next provider", async () => {
  respond = (url) =>
    url.includes("bad") ? json({}, 500) : json({ version: "1.2.3" });
  const provider = chain(
    jsonProvider({ url: "https://bad.test" }),
    jsonProvider({ url: "https://good.test" }),
  );
  expect((await provider.getVersion({ ...base, retries: 0 })).version).toBe(
    "1.2.3",
  );
});

test("5xx is retried, 4xx is not", async () => {
  let n = 0;
  respond = () => (++n < 2 ? json({}, 503) : json({ version: "1.0.1" }));
  expect(
    (
      await jsonProvider({ url: "https://x.test" }).getVersion({
        ...base,
        retries: 1,
      })
    ).version,
  ).toBe("1.0.1");
  expect(calls).toHaveLength(2);

  calls.length = 0;
  respond = () => json({}, 404);
  await expect(
    jsonProvider({ url: "https://x.test" }).getVersion({ ...base, retries: 3 }),
  ).rejects.toBeInstanceOf(HttpError);
  expect(calls).toHaveLength(1);
});

test("a slow request times out", async () => {
  const slow = (async (_u: string, init?: RequestInit) =>
    new Promise((_, reject) =>
      init?.signal?.addEventListener("abort", () =>
        reject(new Error("aborted")),
      ),
    )) as unknown as typeof fetch;
  await expect(
    jsonProvider({ url: "https://x.test" }).getVersion({
      fetch: slow,
      timeoutMs: 10,
      retries: 0,
    }),
  ).rejects.toBeInstanceOf(TimeoutError);
});

test("getLatestVersion caches within the ttl and forceUpdate bypasses it", async () => {
  respond = () =>
    json({ resultCount: 1, results: [{ version: "1.5.0", trackId: 1 }] });
  const opt = { platform: "ios" as const, ...base };
  await getLatestVersion(opt);
  await getLatestVersion(opt);
  expect(calls).toHaveLength(1);
  await getLatestVersion({ ...opt, forceUpdate: true });
  expect(calls).toHaveLength(2);
});

test("getLatestVersion with ignoreErrors false rethrows, default resolves undefined", async () => {
  respond = () => json({}, 404);
  const opt = { provider: jsonProvider({ url: "https://x.test" }), ...base };
  await expect(
    getLatestVersion({ ...opt, ignoreErrors: false }),
  ).rejects.toBeInstanceOf(HttpError);
  const warn = console.warn;
  console.warn = () => {};
  expect(await getLatestVersion(opt)).toBeUndefined();
  console.warn = warn;
});

test("a function provider may return a bare version string", async () => {
  expect(await getLatestVersion({ provider: () => "7.0.0" })).toBe("7.0.0");
});

test("needUpdate end to end with a custom provider", async () => {
  respond = () =>
    json({
      latestVersion: "1.1.0",
      minimumVersion: "1.0.0",
      storeUrl: "https://s.test",
    });
  const result = await needUpdate({
    provider: jsonProvider({ url: "https://x.test" }),
    ...base,
  });
  expect(result).toMatchObject({
    isNeeded: true,
    isForced: false,
    updateType: "minor",
    storeUrl: "https://s.test",
    currentVersion: "1.0.0",
  });
});

test("evaluateUpdate: force, skip, depth and build number", () => {
  const latest = { version: "1.1.0" };
  expect(
    evaluateUpdate("1.0.0", latest, { minimumVersion: "1.0.5" }),
  ).toMatchObject({ isForced: true, isNeeded: true });
  expect(
    evaluateUpdate("1.0.0", latest, { skipVersion: "1.1.0" }),
  ).toMatchObject({ isNeeded: false, isSkipped: true });
  expect(
    evaluateUpdate("1.0.0", latest, {
      skipVersion: "1.1.0",
      minimumVersion: "1.0.5",
    }).isNeeded,
  ).toBe(true);
  expect(evaluateUpdate("1.1.0", { version: "1.1.0" })).toMatchObject({
    isNeeded: false,
    updateType: "none",
  });
  expect(
    evaluateUpdate("1.2.0", { version: "1.2.9" }, { depth: 2 }).isNeeded,
  ).toBe(false);
  expect(
    evaluateUpdate(
      "1.2.0",
      { version: "1.2.0", buildNumber: 9 },
      { currentBuildNumber: 5 },
    ),
  ).toMatchObject({ isNeeded: true, updateType: "build" });
});

test("needUpdate with a given latestVersion makes no request", async () => {
  const result = await needUpdate({
    latestVersion: "1.0.1",
    ignoreErrors: false,
    ...base,
  });
  expect(result.isNeeded).toBe(true);
  expect(calls).toHaveLength(0);
});

test("mock works only when __DEV__ is true", async () => {
  const mock = {
    latestVersion: "9.0.0",
    currentVersion: "1.0.0",
    releaseNotes: "Fake",
  };
  respond = () => json({ version: "1.0.0" });
  const opt = {
    provider: jsonProvider({ url: "https://x.test" }),
    ignoreErrors: false as const,
    mock,
    ...base,
  };

  (globalThis as { __DEV__?: boolean }).__DEV__ = false;
  const off = await needUpdate(opt);
  expect(off.latestVersion).toBe("1.0.0");

  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
  calls.length = 0;
  const on = await needUpdate(opt);
  expect(on).toMatchObject({
    isNeeded: true,
    latestVersion: "9.0.0",
    releaseNotes: "Fake",
    updateType: "major",
  });
  expect(calls).toHaveLength(0);

  setMockVersion({ latestVersion: "2.0.0", minimumVersion: "1.5.0" });
  const global = await needUpdate({ ignoreErrors: false });
  expect(global).toMatchObject({ latestVersion: "2.0.0", isForced: true });
});

test("getStoreUrl builds the Play url and looks up the iOS app id", async () => {
  expect(await getStoreUrl({ platform: "android", ignoreErrors: false })).toBe(
    "https://play.google.com/store/apps/details?id=com.example.app",
  );
  respond = () =>
    json({ resultCount: 1, results: [{ version: "1", trackId: 777 }] });
  expect(
    await getStoreUrl({ platform: "ios", ignoreErrors: false, ...base }),
  ).toBe("itms-apps://apps.apple.com/de/app/id777");
  expect(
    await getStoreUrl({ platform: "ios", appID: "12", ignoreErrors: false }),
  ).toBe("itms-apps://apps.apple.com/de/app/id12");
});

test("dates and calendar versions order correctly", () => {
  expect(evaluateUpdate("2024-10-12", { version: "2024-11-02" }).isNeeded).toBe(
    true,
  );
  expect(evaluateUpdate("2024-11-02", { version: "2024-10-12" }).isNeeded).toBe(
    false,
  );
  expect(evaluateUpdate("2024.10.1", { version: "2024.10.12" }).isNeeded).toBe(
    true,
  );
});

test("a custom compare handles formats the parser rejects", () => {
  const compare = (a: string, b: string) =>
    Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, ""));
  const result = evaluateUpdate(
    "2.0 (build 5)",
    { version: "2.0 (build 9)" },
    { compare },
  );
  expect(result).toMatchObject({ isNeeded: true, updateType: "patch" });
  expect(
    evaluateUpdate("2.0 (build 9)", { version: "2.0 (build 9)" }, { compare })
      .isNeeded,
  ).toBe(false);
});
