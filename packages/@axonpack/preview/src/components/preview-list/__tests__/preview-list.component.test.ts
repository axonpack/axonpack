import { createElement as h } from "react";
import { FlatList } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

import { PreviewProvider } from "../../preview-provider/preview-provider.component";
import { PreviewList } from "../preview-list.component";

jest.mock("expo-file-system", () =>
  require("../../../services/previews/__tests__/fake-file-system.test-helper"),
);
let mockSlug: string | undefined = "shop";
let mockScriptUrl: string | null = null;
jest.mock(
  "react-native/Libraries/NativeModules/specs/NativeSourceCode",
  () => ({ default: { getConstants: () => ({ scriptURL: mockScriptUrl }) } }),
);
let mockNativeState: { bundle?: string; localServer?: string } = {};
jest.mock("expo", () => ({
  requireOptionalNativeModule: () => ({
    key: "version-1.0.0",
    compatibility: "appVersion",
    appName: "Shop",
    appVersion: "1.0.0",
    buildNumber: "7",
    get slug() {
      return mockSlug;
    },
    state: () => mockNativeState,
    markLaunched: () => undefined,
  }),
}));

/** The registry announces 8082, and Metro answers there as this app ("shop"). */
const registryWith8082 = () =>
  jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith(":19150/servers"))
      return Response.json({
        servers: [
          {
            id: "a",
            port: 8082,
            title: "Main-Branch",
            branch: "main",
            worktree: "/w",
            slug: "shop",
            name: "Shop",
            compatibility: "appVersion",
            keys: { ios: "version-1.0.0" },
            startedAt: "",
          },
        ],
      });
    if (url.endsWith(":8082/status"))
      return new Response("packager-status:running");
    if (url.endsWith(":8082/"))
      return Response.json({
        launchAsset: { url: "http://localhost:8082/index.bundle?platform=ios" },
        extra: { expoClient: { slug: "shop", name: "Shop", version: "1.0.0" } },
      });
    return new Response("", { status: 404 });
  }) as typeof fetch;

const notFound = () =>
  jest.fn(async () => new Response("", { status: 404 })) as typeof fetch;

beforeEach(() => {
  mockNativeState = {};
  mockSlug = "shop";
  mockScriptUrl = null;
  global.fetch = notFound();
});

const texts = (tree: ReactTestRenderer) =>
  tree.root
    .findAll(() => true)
    .flatMap((node) =>
      node.children.filter((child) => typeof child === "string"),
    ) as string[];

async function render(devPreviewServers?: boolean) {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      h(PreviewProvider, {
        config: {
          enabled: true,
          url: "http://localhost:9000/b",
          devPreviewServers,
        },
        children: h(PreviewList),
      }),
    );
  });
  return tree;
}

// The first render loads react-native's lazily required components: about 2 s locally with a cold
// transform cache, and past the 5 s test timeout on a CI runner. Pay it once here, with room.
beforeAll(async () => {
  global.fetch = notFound();
  const tree = await render();
  await act(async () => tree.unmount());
}, 30_000);

test("the dev preview servers section is not there unless the app turns it on", async () => {
  const tree = await render();
  expect(texts(tree)).toContain("Previews");
  expect(texts(tree)).not.toContain("Dev preview servers");
  await act(async () => tree.unmount());
});

test("with it on, a debug build shows the section", async () => {
  const tree = await render(true);
  expect(texts(tree)).toContain("Dev preview servers");
  expect(texts(tree)).toContain(
    "No Metro server found. Start one with npx preview start.",
  );
  await act(async () => tree.unmount());
});

test("a release build never shows it", async () => {
  const dev = (global as { __DEV__?: boolean }).__DEV__;
  (global as { __DEV__?: boolean }).__DEV__ = false;
  try {
    const tree = await render(true);
    expect(texts(tree)).not.toContain("Dev preview servers");
    await act(async () => tree.unmount());
  } finally {
    (global as { __DEV__?: boolean }).__DEV__ = dev;
  }
});

const METRO_NOTE =
  "Debug build: Metro is not used while a preview runs. Go back to base to load from Metro again.";

test("a preview running in a debug build says Metro is not used", async () => {
  mockNativeState = { bundle: "task-1/ios/main.jsbundle" };
  mockScriptUrl = "file:///data/Documents/preview/task-1/ios/main.jsbundle";
  const tree = await render(true);
  expect(texts(tree)).toContain("Preview · task-1");
  expect(texts(tree)).toContain(METRO_NOTE);
  expect(texts(tree)).toContain("Back to base");
  await act(async () => tree.unmount());
});

test("a dev preview server picked by hand is named, with Stop and no Metro note", async () => {
  mockNativeState = {
    bundle: "task-1/ios/main.jsbundle",
    localServer: "http://localhost:8082/index.bundle?platform=ios",
  };
  mockScriptUrl = "http://localhost:8082/index.bundle?platform=ios";
  const tree = await render(true);
  expect(texts(tree)).toContain("Dev preview server · localhost:8082");
  expect(texts(tree)).toContain("Stop using dev preview server");
  expect(texts(tree)).not.toContain(METRO_NOTE);
  await act(async () => tree.unmount());
});

test("a release-style start is the base built into the app, with the build's facts", async () => {
  const tree = await render(true);
  const all = texts(tree);
  expect(all).toContain("Base · built into the app");
  expect(all).not.toContain(METRO_NOTE);
  expect(all).not.toContain("Back to base");
  for (const fact of [
    "Shop",
    "1.0.0 (7)",
    "iOS",
    "App version · version-1.0.0",
  ])
    expect(all).toContain(fact);
  await act(async () => tree.unmount());
});

test("the base on Expo's Metro says so, with its address", async () => {
  mockScriptUrl = "http://localhost:8081/index.bundle?platform=ios";
  const tree = await render(true);
  expect(texts(tree)).toContain("Base · Expo dev server · localhost:8081");
  expect(texts(tree)).toContain("Expo dev server");
  await act(async () => tree.unmount());
});

test("the base on a preview start server names it as a dev preview server", async () => {
  mockScriptUrl = "http://localhost:8082/index.bundle?platform=ios";
  global.fetch = registryWith8082();
  const tree = await render(true);
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
  expect(texts(tree)).toContain(
    "Base · Dev preview server · Main-Branch · localhost:8082",
  );
  await act(async () => tree.unmount());
});

test("a build with no slug says so instead of listing other apps' servers", async () => {
  mockSlug = undefined;
  const tree = await render(true);
  expect(texts(tree)).toContain("Dev preview servers");
  expect(texts(tree)).toContain(
    "This build has no app slug, so it cannot tell its servers from other apps'. Add the config plugin and rebuild.",
  );
  expect(texts(tree)).not.toContain(
    "No Metro server found. Start one with npx preview start.",
  );
  await act(async () => tree.unmount());
});

test("a build with no bucket URL says which setting is missing", async () => {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      h(PreviewProvider, {
        config: { enabled: true, url: "" },
        children: h(PreviewList),
      }),
    );
  });
  expect(texts(tree).join("\n")).toContain(
    "No bucket URL. Set `url` in the preview config",
  );
  await act(async () => tree.unmount());
});

test("pulling the list down asks the bucket again", async () => {
  const tree = await render();
  const fetch = global.fetch as jest.Mock;
  const before = fetch.mock.calls.length;
  await act(async () => tree.root.findByType(FlatList).props.onRefresh());
  expect(fetch.mock.calls.length).toBeGreaterThan(before);
  await act(async () => tree.unmount());
});
