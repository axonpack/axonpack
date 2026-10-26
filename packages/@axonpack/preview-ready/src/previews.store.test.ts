import { disk } from "./fake-file-system.test-helper";
import { previewsStore } from "./previews.store";

jest.mock("expo-file-system", () => require("./fake-file-system.test-helper"));

const mockNative = {
  bundle: null as string | null,
  fingerprint: "fp",
  select: jest.fn((bundle: string | null) => {
    mockNative.bundle = bundle;
  }),
  reload: jest.fn(),
  state: () => ({ bundle: mockNative.bundle }),
};
jest.mock("expo", () => ({ requireOptionalNativeModule: () => mockNative }));

const config = { enabled: true, url: "http://localhost:9000/b" };

const saveDownload = (id: string, fingerprint: string) => {
  const root = "file:/docs/preview-ready";
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
        fingerprint,
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

test("deleting the running preview goes back to the base bundle first", async () => {
  saveDownload("a", "fp");
  mockNative.bundle = "a/ios/main.jsbundle";
  await previewsStore.refresh(config);
  expect(previewsStore.getState().activeId).toBe("a");
  await previewsStore.remove("a");
  expect(mockNative.select).toHaveBeenCalledWith(null);
  expect(mockNative.reload).toHaveBeenCalled();
  expect(disk.has("file:/docs/preview-ready/a")).toBe(false);
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
