import { useEffect } from "react";
import { TurboModuleRegistry } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

import { PreviewProvider } from "../../../components/preview-provider/preview-provider.component";
import { devPreviewServersStore } from "../../../stores/dev-preview-servers/dev-preview-servers.store";
import type { NativeState } from "../../native/native.service";
import {
  type PreviewStatusInfo,
  usePreviewStatus,
} from "../use-preview-status.service";

jest.mock("expo-file-system", () =>
  require("../../previews/__tests__/fake-file-system.test-helper"),
);
let mockScriptUrl: string | null = null;
const realGet = TurboModuleRegistry.get;
jest
  .spyOn(TurboModuleRegistry, "get")
  .mockImplementation(((name: string) =>
    name === "SourceCode"
      ? { getConstants: () => ({ scriptURL: mockScriptUrl }) }
      : realGet(name)) as typeof TurboModuleRegistry.get);
jest.mock(
  "react-native/Libraries/NativeModules/specs/NativeSourceCode",
  () => ({ default: { getConstants: () => ({ scriptURL: mockScriptUrl }) } }),
);
let mockNativeState: NativeState = {};
const mockNative = {
  key: "version-1.0.0",
  compatibility: "appVersion",
  slug: "shop",
  appName: "Shop",
  appVersion: "1.0.0",
  buildNumber: "7",
  state: () => mockNativeState,
  markLaunched: jest.fn(),
  selectLocalServer: jest.fn(),
  select: jest.fn(),
  reload: jest.fn(),
};
jest.mock("expo", () => ({ requireOptionalNativeModule: () => mockNative }));

const PUBLISHED = "2026-10-01T10:00:00.000Z";
const bucket = () =>
  jest.fn(async (input: RequestInfo | URL) =>
    String(input).endsWith("/index/ios/version-1.0.0.json")
      ? Response.json({
          previews: [
            {
              id: "task-1",
              title: "Login fix",
              branch: "task-1-login",
              commit: "abc1234def",
              author: "Ana",
              publishedAt: PUBLISHED,
              environment: "staging",
              revision: "r1",
            },
          ],
        })
      : new Response("", { status: 404 }),
  ) as typeof fetch;

/** The bucket, and this app's Metro answering on 8081. */
const bucketAndMetro = () => {
  const fromBucket = bucket();
  return jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith(":8081/status"))
      return new Response("packager-status:running");
    if (url.endsWith(":8081/"))
      return Response.json({
        launchAsset: { url: "http://localhost:8081/index.bundle?platform=ios" },
        extra: { expoClient: { slug: "shop", name: "Shop", version: "1.0.0" } },
      });
    return fromBucket(input);
  }) as typeof fetch;
};

let status!: PreviewStatusInfo;
function Probe() {
  const latest = usePreviewStatus();
  useEffect(() => {
    status = latest;
  });
  return null;
}

async function render(url = "http://localhost:9000/b") {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      <PreviewProvider
        config={{
          enabled: true,
          s3Config: url ? { url } : undefined,
          devPreviewServers: true,
        }}
      >
        <Probe />
      </PreviewProvider>,
    );
  });
  return tree;
}

const THIS_BUILD = {
  app: { name: "Shop", version: "1.0.0", buildNumber: "7", platform: "ios" },
  compatibility: { mode: "appVersion", key: "version-1.0.0" },
  previewsConfigured: true,
  loading: false,
  error: null,
};
const NO_PREVIEW = {
  id: null,
  environment: null,
  author: null,
  commit: null,
  publishedAt: null,
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockNativeState = {};
  mockScriptUrl = null;
  global.fetch = bucket();
  // The servers store lives for the whole file; one look clears a server an earlier test picked.
  await devPreviewServersStore.refresh();
});

test("the default Metro, with nothing picked", async () => {
  mockScriptUrl = "http://localhost:8081/index.bundle?platform=ios";
  mockNativeState = {
    defaultServer: "localhost:8081",
    loaded: { kind: "default" },
  };
  global.fetch = bucketAndMetro();
  const tree = await render();
  await act(() => devPreviewServersStore.refresh());
  expect(status).toMatchObject({
    ...THIS_BUILD,
    ...NO_PREVIEW,
    kind: "default",
    bundleKind: "expo-dev-server",
    title: "Default",
    branch: null,
    address: "localhost:8081",
    label: "Expo server, localhost:8081",
    isDefault: true,
    online: true,
    scanning: false,
    canGoBack: false,
  });
  let sweep!: Promise<void>;
  act(() => {
    sweep = devPreviewServersStore.refresh();
  });
  expect(status.scanning).toBe(true);
  await act(() => sweep);
  expect(status.scanning).toBe(false);
  await act(async () => tree.unmount());
});

test("a server picked in the list that no look has found, and the way back clears it", async () => {
  const url = "http://127.0.0.1:8082/index.bundle?platform=ios";
  mockScriptUrl = url;
  mockNativeState = {
    localServer: url,
    defaultServer: "localhost:8081",
    loaded: { kind: "server", url },
  };
  const tree = await render();
  await act(() => devPreviewServersStore.refresh());
  // Nothing answers there and nothing was saved, so its kind and name are not known.
  expect(status).toMatchObject({
    ...THIS_BUILD,
    ...NO_PREVIEW,
    kind: "local",
    bundleKind: "server",
    title: "localhost:8082",
    address: "localhost:8082",
    label: "Server, localhost:8082",
    isDefault: false,
    online: false,
    canGoBack: true,
  });
  await act(() => status.backToDefault());
  expect(mockNative.selectLocalServer).toHaveBeenCalledWith(null, null);
  expect(mockNative.select).toHaveBeenCalledWith(null, null);
  expect(mockNative.reload).toHaveBeenCalled();
  await act(async () => tree.unmount());
});

test("a preview, with what it was published with", async () => {
  mockScriptUrl = "file:///data/Documents/preview/task-1/ios/main.jsbundle";
  mockNativeState = {
    bundle: "task-1/ios/main.jsbundle",
    loaded: { kind: "preview", id: "task-1" },
  };
  const tree = await render();
  expect(status).toMatchObject({
    ...THIS_BUILD,
    kind: "preview",
    bundleKind: "preview",
    title: "Login fix",
    id: "task-1",
    branch: "task-1-login",
    address: null,
    label: "Preview, Login fix",
    isDefault: false,
    online: null,
    environment: "staging",
    author: "Ana",
    commit: "abc1234def",
    publishedAt: PUBLISHED,
    canGoBack: true,
  });
  await act(async () => tree.unmount());
});

test("the bundle built into the app", async () => {
  const tree = await render();
  expect(status).toMatchObject({
    ...THIS_BUILD,
    ...NO_PREVIEW,
    kind: "default",
    bundleKind: "built-in",
    title: "Built into the app",
    branch: null,
    address: null,
    label: "Built into the app",
    isDefault: true,
    online: null,
    canGoBack: false,
  });
  const fetches = (global.fetch as jest.Mock).mock.calls.length;
  await act(() => status.refresh());
  expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(
    fetches,
  );
  await act(async () => tree.unmount());
});

test("with no bucket URL, previews are not configured and that is no error", async () => {
  const tree = await render("");
  expect(status).toMatchObject({
    ...THIS_BUILD,
    previewsConfigured: false,
    error: null,
    kind: "default",
  });
  await act(async () => tree.unmount());
});
