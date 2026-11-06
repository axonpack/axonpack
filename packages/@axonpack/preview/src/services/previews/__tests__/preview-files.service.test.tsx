import { useEffect } from "react";
import { act, create } from "react-test-renderer";

import { PreviewProvider } from "../../../components/preview-provider/preview-provider.component";
import type { PreviewConfig } from "../../../utils/config/config.util";
import type { NativeState } from "../../native/native.service";
import {
  checkRunningFiles,
  previewsStore,
} from "../../../stores/previews/previews.store";
import {
  type PreviewFiles,
  checkFilesFolder,
  previewFilesPath,
} from "../preview-files.service";
import { usePreviewFiles } from "../use-preview-files.service";
import { disk } from "./fake-file-system.test-helper";

jest.mock("expo-file-system", () => require("./fake-file-system.test-helper"));
let mockNative: { state: () => NativeState; markLaunched: () => void } | null;
jest.mock("expo", () => ({ requireOptionalNativeModule: () => mockNative }));

const runs = (state: NativeState) => {
  mockNative = { state: () => state, markLaunched: () => undefined };
};
const config: PreviewConfig = {
  enabled: true,
  files: { www: { default: "file:///android_asset/www" } },
};
const DEFAULT: PreviewFiles = {
  uri: "file:///android_asset/www/",
  source: "default",
  previewId: null,
  ready: true,
};
const WWW = "file:/docs/preview/task-1/ios/files/www";

beforeEach(() => {
  disk.clear();
  runs({});
});

test("the default copy while the app's own bundle runs, with a slash to add a file name to", () => {
  expect(previewFilesPath("www", config)).toEqual(DEFAULT);
});

test("the running preview's own copy when it was published with the set", () => {
  disk.set(WWW, "dir");
  runs({ loaded: { kind: "preview", id: "task-1" } });
  expect(previewFilesPath("www", config)).toEqual({
    uri: `${WWW}/`,
    source: "preview",
    previewId: "task-1",
    ready: true,
  });
});

test("the default copy when the running preview was published without the set", () => {
  disk.set("file:/docs/preview/task-1/ios", "dir");
  runs({ loaded: { kind: "preview", id: "task-1" } });
  expect(previewFilesPath("www", config)).toEqual(DEFAULT);
});

test("a preview that is chosen but did not load leaves the default's files with the default bundle", () => {
  disk.set(WWW, "dir");
  runs({ bundle: "task-1/ios/main.jsbundle", loaded: { kind: "default" } });
  expect(previewFilesPath("www", config)).toEqual(DEFAULT);
});

test("the default copy where the native module isn't linked (Expo Go, web)", () => {
  disk.set(WWW, "dir");
  mockNative = null;
  expect(previewFilesPath("www", config)).toEqual(DEFAULT);
});

test("a name the config doesn't list says what to add", () => {
  expect(() => previewFilesPath("docs", config)).toThrow(
    "the preview config has no files.docs",
  );
});

test("usePreviewFiles reads the provider's config", async () => {
  disk.set(WWW, "dir");
  runs({ loaded: { kind: "preview", id: "task-1" } });
  let files: PreviewFiles | null = null;
  function Probe() {
    const latest = usePreviewFiles("www");
    useEffect(() => {
      files = latest;
    });
    return null;
  }
  // enabled false: no bucket reads, which this test doesn't need.
  let tree: ReturnType<typeof create> | null = null;
  await act(async () => {
    tree = create(
      <PreviewProvider config={{ ...config, enabled: false }}>
        <Probe />
      </PreviewProvider>,
    );
  });
  act(() => tree!.unmount());
  expect(files).toEqual({
    uri: `${WWW}/`,
    source: "preview",
    previewId: "task-1",
    ready: true,
  });
});

describe("onPostDownload again when the app's folder moved", () => {
  const folder = (id: string) => `file:/docs/preview/${id}/ios/files/www/`;
  const OLD = "file:/old-app-folder/Documents/preview/x/ios/files/www/";
  const meta = (id: string) => `file:/docs/preview/${id}/ios.json`;
  const record = (id: string) =>
    JSON.parse(new TextDecoder().decode(disk.get(meta(id)) as Uint8Array));
  /** Preview `id` is downloaded and runs; its www onPostDownload last ran with `ranWith`. */
  const running = (id: string, ranWith?: string) => {
    disk.set(`file:/docs/preview/${id}`, "dir");
    disk.set(`file:/docs/preview/${id}/ios`, "dir");
    disk.set(folder(id).slice(0, -1), "dir");
    disk.set(
      meta(id),
      new TextEncoder().encode(
        JSON.stringify({
          id,
          platform: "ios",
          key: "fp",
          revision: "r1",
          downloadedAt: "2026-01-01",
          entry: { id },
          ...(ranWith && { onPostDownloadUris: { www: ranWith } }),
        }),
      ),
    );
    runs({ loaded: { kind: "preview", id } });
  };
  const withOnPostDownload = (
    onPostDownload: NonNullable<
      NonNullable<PreviewConfig["files"]>[string]["onPostDownload"]
    >,
  ): PreviewConfig => ({
    enabled: true,
    files: { www: { default: "file:///android_asset/www", onPostDownload } },
  });

  test("a moved folder runs it once with the old folder, records the new one, then is ready", async () => {
    running("moved", OLD);
    const onPostDownload = jest.fn();
    const moved = withOnPostDownload(onPostDownload);
    expect(previewFilesPath("www", moved).ready).toBe(false);
    await checkFilesFolder(moved);
    await checkFilesFolder(moved);
    expect(onPostDownload).toHaveBeenCalledTimes(1);
    expect(onPostDownload).toHaveBeenCalledWith("www", folder("moved"), {
      previousUri: OLD,
    });
    expect(record("moved").onPostDownloadUris).toEqual({
      www: folder("moved"),
    });
    expect(previewFilesPath("www", moved)).toEqual({
      uri: folder("moved"),
      source: "preview",
      previewId: "moved",
      ready: true,
    });
  });

  test("a folder that didn't move runs nothing", async () => {
    running("same", folder("same"));
    const onPostDownload = jest.fn();
    await checkFilesFolder(withOnPostDownload(onPostDownload));
    expect(onPostDownload).not.toHaveBeenCalled();
    expect(
      previewFilesPath("www", withOnPostDownload(onPostDownload)).ready,
    ).toBe(true);
  });

  test("a set without onPostDownload is ready from the start, before any check", () => {
    running("plain", OLD);
    expect(previewFilesPath("www", config)).toEqual({
      uri: folder("plain"),
      source: "preview",
      previewId: "plain",
      ready: true,
    });
  });

  test("one that throws deletes the download, shows the error, and never hands out the folder as ready", async () => {
    running("throws", OLD);
    const throws = withOnPostDownload(() => {
      throw new Error("rewrite failed");
    });
    await checkRunningFiles(throws);
    expect(previewsStore.getState().error).toBe("rewrite failed");
    expect(
      [...disk.keys()].filter((key) => key.includes("preview/throws")),
    ).toEqual([]);
    expect(previewsStore.getState().local).toEqual([]);
    expect(previewFilesPath("www", throws)).toEqual({
      uri: folder("throws"),
      source: "preview",
      previewId: "throws",
      ready: false,
    });
  });

  test("usePreviewFiles turns ready once the check is done", async () => {
    running("hook", folder("hook"));
    const seen: boolean[] = [];
    function Probe() {
      seen.push(usePreviewFiles("www").ready);
      return null;
    }
    let tree: ReturnType<typeof create> | null = null;
    await act(async () => {
      tree = create(
        <PreviewProvider
          config={{ ...withOnPostDownload(jest.fn()), enabled: false }}
        >
          <Probe />
        </PreviewProvider>,
      );
    });
    act(() => tree!.unmount());
    expect(seen[0]).toBe(false);
    expect(seen[seen.length - 1]).toBe(true);
  });
});
