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

let status!: PreviewStatusInfo;
function Probe() {
  const latest = usePreviewStatus();
  useEffect(() => {
    status = latest;
  });
  return null;
}

async function render() {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      <PreviewProvider
        config={{
          enabled: true,
          url: "http://localhost:9000/b",
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
  const tree = await render();
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
    canGoBack: false,
  });
  await act(async () => tree.unmount());
});

test("a server picked in the list, and the way back clears it", async () => {
  const url = "http://127.0.0.1:8082/index.bundle?platform=ios";
  mockScriptUrl = url;
  mockNativeState = {
    localServer: url,
    defaultServer: "localhost:8081",
    loaded: { kind: "server", url },
  };
  const tree = await render();
  expect(status).toMatchObject({
    ...THIS_BUILD,
    ...NO_PREVIEW,
    kind: "local",
    bundleKind: "dev-preview-server",
    title: "Preview server",
    address: "localhost:8082",
    label: "Preview server, localhost:8082",
    isDefault: false,
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
    canGoBack: false,
  });
  const fetches = (global.fetch as jest.Mock).mock.calls.length;
  await act(() => status.refresh());
  expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(
    fetches,
  );
  await act(async () => tree.unmount());
});
