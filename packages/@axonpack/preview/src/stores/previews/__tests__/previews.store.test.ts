import { disk } from "../../../services/previews/__tests__/fake-file-system.test-helper";
import { previewsStore } from "../previews.store";

jest.mock("expo-file-system", () =>
  require("../../../services/previews/__tests__/fake-file-system.test-helper"),
);

const mockNative = {
  bundle: null as string | null,
  key: "fp",
  select: jest.fn((bundle: string | null, _key?: string | null) => {
    mockNative.bundle = bundle;
  }),
  reload: jest.fn(),
  markLaunched: jest.fn(),
  selectLocalServer: jest.fn(),
  state: () => ({ bundle: mockNative.bundle, broken: [] as string[] }),
};
jest.mock("expo", () => ({ requireOptionalNativeModule: () => mockNative }));

const config = { enabled: true, url: "http://localhost:9000/b" };

const saveDownload = (id: string, buildKey: string) => {
  const root = "file:/docs/preview";
  disk.set(root, "dir");
  disk.set(`${root}/${id}`, "dir");
  disk.set(`${root}/${id}/ios`, "dir");
  disk.set(`${root}/${id}/ios/main.jsbundle`, new Uint8Array([1]));
  disk.set(
    `${root}/${id}/ios.json`,
    new TextEncoder().encode(
      JSON.stringify({
        id,
        platform: "ios",
        key: buildKey,
        revision: "r",
        downloadedAt: "",
        entry: { id },
      }),
    ),
  );
};

beforeEach(() => {
  disk.clear();
  mockNative.bundle = null;
  jest.clearAllMocks();
  global.fetch = jest.fn(
    async () => new Response("", { status: 404 }),
  ) as typeof fetch;
});

test("deleting the running preview goes back to the default bundle first", async () => {
  saveDownload("a", "fp");
  mockNative.bundle = "a/ios/main.jsbundle";
  await previewsStore.refresh(config);
  expect(previewsStore.getState().activeId).toBe("a");
  await previewsStore.remove("a");
  expect(mockNative.select).toHaveBeenCalledWith(null, null);
  expect(mockNative.reload).toHaveBeenCalled();
  expect(disk.has("file:/docs/preview/a")).toBe(false);
  expect(previewsStore.getState().local).toEqual([]);
});

test("delete all removes only downloads for another build", async () => {
  saveDownload("mine", "fp");
  saveDownload("old", "other");
  await previewsStore.refresh(config);
  await previewsStore.removeIncompatible();
  expect(previewsStore.getState().local.map((p) => p.id)).toEqual(["mine"]);
  expect(mockNative.reload).not.toHaveBeenCalled();
});

test("switching to a preview that is not on the device downloads it first", async () => {
  const bundle = new TextEncoder().encode("b");
  const { sha256Hex } = require("../../../utils/s3/sigv4.util");
  const sha = sha256Hex(bundle);
  const entry = {
    id: "t",
    title: "T",
    branch: "t",
    commit: "c",
    author: "a",
    publishedAt: "p",
    appVersion: "1",
    buildNumber: "1",
    revision: "r",
    size: 1,
    changelog: "",
    manifest: "previews/ios/fp/t.json",
  };
  const objects: Record<string, unknown> = {
    "index/ios/fp.json": { previews: [entry] },
    "previews/ios/fp/t.json": {
      key: "fp",
      bundle: "main.jsbundle",
      files: [{ path: "main.jsbundle", sha256: sha, size: 1 }],
    },
    [`files/${sha}`]: bundle,
  };
  global.fetch = jest.fn(async (url: string | URL) => {
    const body = objects[String(url).replace("http://localhost:9000/b/", "")];
    if (body === undefined) return new Response("", { status: 404 });
    return new Response(
      (body instanceof Uint8Array ? body : JSON.stringify(body)) as BodyInit,
    );
  }) as typeof fetch;
  await previewsStore.refresh({ ...config, buildKey: "fp" });
  await previewsStore.switchTo({ ...config, buildKey: "fp" }, "t");
  expect(disk.get("file:/docs/preview/t/ios/main.jsbundle")).toEqual(bundle);
  expect(mockNative.select).toHaveBeenCalledWith("t/ios/main.jsbundle", "fp");
  expect(mockNative.reload).toHaveBeenCalled();
});

test("the list shows why a refresh failed when the bucket URL answers with a web page", async () => {
  global.fetch = jest.fn(
    async () =>
      new Response("<html>login</html>", {
        headers: { "content-type": "text/html" },
      }),
  ) as typeof fetch;
  await previewsStore.refresh({ ...config, buildKey: "fp" });
  expect(previewsStore.getState().error).toMatch(
    /^Expected JSON from http:\/\/localhost:9000\/b\/index\/ios\/fp\.json but got text\/html \(status 200\)/,
  );
});

test("a failing native call shows its reason in the list instead of doing nothing", async () => {
  saveDownload("a", "fp");
  mockNative.select.mockImplementationOnce(() => {
    throw new Error("Received 2 arguments, but 1 was expected");
  });
  await previewsStore.refresh(config);
  await expect(previewsStore.switchTo(config, "a")).resolves.toBeUndefined();
  expect(previewsStore.getState().error).toBe(
    "Received 2 arguments, but 1 was expected",
  );
  expect(mockNative.reload).not.toHaveBeenCalled();
});

test("each refresh replaces the list with what the bucket says now", async () => {
  const entry = (id: string) => ({
    id,
    title: id,
    revision: "r",
    publishedAt: id,
  });
  let previews = [entry("one")];
  global.fetch = jest.fn(
    async () => new Response(JSON.stringify({ previews })),
  ) as typeof fetch;
  await previewsStore.refresh({ ...config, buildKey: "fp" });
  expect(previewsStore.getState().remote?.map((p) => p.id)).toEqual(["one"]);
  previews = [entry("two"), entry("one")];
  await previewsStore.refresh({ ...config, buildKey: "fp" });
  expect(previewsStore.getState().remote?.map((p) => p.id)).toEqual([
    "two",
    "one",
  ]);
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test("back to the default bundle also stops a local Metro server", async () => {
  await previewsStore.refresh(config);
  await previewsStore.switchTo(config, null);
  expect(mockNative.selectLocalServer).toHaveBeenCalledWith(null, null);
  expect(mockNative.select).toHaveBeenCalledWith(null, null);
  expect(mockNative.reload).toHaveBeenCalled();
});

test("switching to a preview stops using a picked server first", async () => {
  saveDownload("a", "fp");
  await previewsStore.refresh(config);
  await previewsStore.switchTo(config, "a");
  expect(mockNative.selectLocalServer).toHaveBeenCalledWith(null, null);
  expect(mockNative.selectLocalServer.mock.invocationCallOrder[0]).toBeLessThan(
    mockNative.reload.mock.invocationCallOrder[0],
  );
  expect(mockNative.select).toHaveBeenCalledWith("a/ios/main.jsbundle", "fp");
});

test("with no bucket URL nothing is asked of a bucket, and it is no error", async () => {
  saveDownload("a", "fp");
  for (const bucket of [
    {},
    { s3Config: { url: undefined } },
    { s3Config: { url: "" } },
    { s3Config: { url: " " } },
    { url: "" },
  ]) {
    await previewsStore.refresh({ enabled: true, buildKey: "fp", ...bucket });
    expect(previewsStore.getState()).toMatchObject({
      loading: false,
      error: null,
      remote: null,
    });
  }
  // The download on the device is still listed, and one not on it can't be fetched.
  expect(previewsStore.getState().local.map((p) => p.id)).toEqual(["a"]);
  await previewsStore.switchTo({ enabled: true, buildKey: "fp" }, "b");
  expect(global.fetch).not.toHaveBeenCalled();
  expect(mockNative.reload).not.toHaveBeenCalled();
});

test("a relative bucket URL is set but wrong, so a refresh still errors", async () => {
  await previewsStore.refresh({
    enabled: true,
    buildKey: "fp",
    s3Config: { url: "/previews" },
  });
  expect(previewsStore.getState().error).toMatch(/is not a full address/);
});
