import { FlatList, TurboModuleRegistry, View } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

import { PreviewProvider } from "../../preview-provider/preview-provider.component";
import { PreviewList } from "../preview-list.component";
import { Chevron } from "../ui/chevron.ui";
import { devPreviewServersStore } from "../../../stores/dev-preview-servers/dev-preview-servers.store";

jest.mock("expo-file-system", () =>
  require("../../../services/previews/__tests__/fake-file-system.test-helper"),
);
let mockSlug: string | undefined = "shop";
let mockScriptUrl: string | null = null;
const realGet = TurboModuleRegistry.get;
jest
  .spyOn(TurboModuleRegistry, "get")
  .mockImplementation(((name: string) =>
    name === "SourceCode"
      ? { getConstants: () => ({ scriptURL: mockScriptUrl }) }
      : realGet(name)) as typeof TurboModuleRegistry.get);
// What discover.service reads for the host its servers are on.
jest.mock(
  "react-native/Libraries/NativeModules/specs/NativeSourceCode",
  () => ({ default: { getConstants: () => ({ scriptURL: mockScriptUrl }) } }),
);
let mockNativeState: {
  bundle?: string;
  localServer?: string;
  defaultServer?: string;
} = {};
const mockSelectLocalServer = jest.fn();
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
    selectLocalServer: mockSelectLocalServer,
    select: () => undefined,
    reload: () => undefined,
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

beforeEach(async () => {
  mockNativeState = {};
  mockSlug = "shop";
  mockScriptUrl = null;
  global.fetch = notFound();
  // The servers store lives for the whole file; one look clears a server an earlier test picked.
  await devPreviewServersStore.refresh();
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
      <PreviewProvider
        config={{
          enabled: true,
          url: "http://localhost:9000/b",
          devPreviewServers,
        }}
      >
        <PreviewList />
      </PreviewProvider>,
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
  // The list opens with the card for what runs now, with no title above it.
  expect(texts(tree)).not.toContain("Previews");
  expect(texts(tree)).toContain("Published previews");
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
  "Debug build: Metro is not used while a preview runs. Use the default bundle to load from Metro again.";

/** The bucket lists one preview for this build, published with an EAS environment. */
const bucketWithPreview = (environment: string | null = "staging") =>
  jest.fn(async (input: RequestInfo | URL) =>
    String(input).endsWith("/index/ios/version-1.0.0.json")
      ? Response.json({
          schema: 1,
          platform: "ios",
          key: "version-1.0.0",
          compatibility: "appVersion",
          updatedAt: "",
          previews: [
            {
              id: "task-1",
              title: "Login fix",
              branch: "task-1-login",
              commit: "abc1234def",
              author: "Ana",
              publishedAt: "2026-10-01T10:00:00.000Z",
              appVersion: "1.0.0",
              buildNumber: "7",
              compatibility: "appVersion",
              fingerprint: "fp",
              environment: environment ?? undefined,
              revision: "r1",
              size: 1000,
              changelog: "",
              manifest: "previews/ios/version-1.0.0/task-1.json",
            },
          ],
        })
      : new Response("", { status: 404 }),
  ) as typeof fetch;

const pressable = (tree: ReactTestRenderer, text: string) =>
  tree.root.find(
    (node) =>
      typeof node.props.onPress === "function" &&
      (node.props.accessibilityLabel === text ||
        node.findAll((n) => n.children.includes(text)).length > 0),
  );

async function showDetails(tree: ReactTestRenderer) {
  await act(async () => pressable(tree, "Show details").props.onPress());
}

test("a preview: its title and branch, the environment, who published it, and the Metro note", async () => {
  mockNativeState = { bundle: "task-1/ios/main.jsbundle" };
  mockScriptUrl = "file:///data/Documents/preview/task-1/ios/main.jsbundle";
  global.fetch = bucketWithPreview();
  const tree = await render(true);
  const all = texts(tree);
  for (const text of [
    "Login fix",
    "task-1-login",
    "Preview",
    "staging",
    "Ana",
    METRO_NOTE,
    "Use the default bundle",
  ])
    expect(all).toContain(text);
  expect(all).not.toContain("Stop server");
  expect(all).not.toContain("abc1234");
  await showDetails(tree);
  expect(texts(tree)).toContain("abc1234");
  expect(texts(tree)).toContain("task-1");
  expect(texts(tree)).toContain("Environment");
  expect(texts(tree)).toContain("Shop");
  expect(texts(tree)).toContain("1.0.0 (7)");
  expect(texts(tree)).toContain("Hide details");
  await act(async () => tree.unmount());
});

test("a preview published without an environment has no chip and no Environment row", async () => {
  mockNativeState = { bundle: "task-1/ios/main.jsbundle" };
  mockScriptUrl = "file:///data/Documents/preview/task-1/ios/main.jsbundle";
  global.fetch = bucketWithPreview(null);
  const tree = await render(true);
  expect(texts(tree)).toContain("Login fix");
  expect(texts(tree)).not.toContain("staging");
  await showDetails(tree);
  expect(texts(tree)).toContain("abc1234");
  expect(texts(tree)).not.toContain("Environment");
  await act(async () => tree.unmount());
});

test("a dev preview server picked by hand: its address, one way back, and no Metro note", async () => {
  mockNativeState = {
    bundle: "task-1/ios/main.jsbundle",
    localServer: "http://127.0.0.1:8082/index.bundle?platform=ios",
  };
  mockScriptUrl = "http://127.0.0.1:8082/index.bundle?platform=ios";
  const tree = await render(true);
  const all = texts(tree);
  expect(all).toContain("Dev preview server");
  // One machine, one name.
  expect(all).toContain("localhost:8082");
  expect(all).not.toContain("127.0.0.1:8082");
  expect(all).not.toContain("Stop server");
  expect(all.filter((t) => t === "Use the default bundle")).toHaveLength(1);
  expect(all).not.toContain(METRO_NOTE);
  await act(async () => tree.unmount());
});

test("a server picked by hand, with no preview chosen, offers Use the default bundle, which clears it", async () => {
  mockNativeState = {
    localServer: "http://127.0.0.1:8082/index.bundle?platform=ios",
  };
  mockScriptUrl = "http://127.0.0.1:8082/index.bundle?platform=ios";
  const tree = await render(true);
  expect(texts(tree)).not.toContain("Stop server");
  mockSelectLocalServer.mockClear();
  await act(async () =>
    pressable(tree, "Use the default bundle").props.onPress(),
  );
  expect(mockSelectLocalServer).toHaveBeenCalledWith(null, null);
  await act(async () => tree.unmount());
});

test("the Metro the app starts on, picked by hand under another name, shows as the default", async () => {
  mockNativeState = {
    localServer: "http://127.0.0.1:8081/index.bundle?platform=ios",
    defaultServer: "localhost:8081",
  };
  mockScriptUrl = "http://127.0.0.1:8081/index.bundle?platform=ios";
  // Metro answers on 8081 as this app, so the scan finds it and names it.
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith(":8081/status"))
      return new Response("packager-status:running");
    if (url.endsWith(":8081/"))
      return Response.json({
        launchAsset: { url: mockScriptUrl },
        extra: { expoClient: { slug: "shop", name: "Shop", version: "1.0.0" } },
      });
    return new Response("", { status: 404 });
  }) as typeof fetch;
  const tree = await render(true);
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
  const all = texts(tree);
  expect(all).toContain("Shop");
  expect(all).toContain("Default bundle");
  expect(all).not.toContain("Use the default bundle");
  expect(byId(tree, "hero-actions")).toEqual([]);
  // Not filled as something switched in.
  const chip = tree.root.find((node) => node.props.text === "Expo dev server");
  expect(chip.props.tone).toBe("neutral");
  await act(async () => tree.unmount());
});

test("built into the app: the default bundle, no way back to offer, the build behind Show details", async () => {
  const tree = await render(true);
  const all = texts(tree);
  for (const text of ["Built into the app", "Default bundle"])
    expect(all).toContain(text);
  // The app's own facts wait behind Show details.
  expect(all).not.toContain("Shop");
  expect(all).not.toContain("1.0.0 (7)");
  expect(all).not.toContain(METRO_NOTE);
  expect(all).not.toContain("Use the default bundle");
  expect(all).not.toContain("Stop server");
  await showDetails(tree);
  for (const text of [
    "Shop",
    "1.0.0 (7)",
    "iOS",
    "App version",
    "version-1.0.0",
  ])
    expect(texts(tree)).toContain(text);
  expect(texts(tree)).not.toContain("Environment");
  await act(async () => tree.unmount());
});

test("the app's own bundle from Expo's Metro names the server and its address", async () => {
  mockScriptUrl = "http://localhost:8081/index.bundle?platform=ios";
  const tree = await render(true);
  const all = texts(tree);
  expect(all).toContain("Expo dev server");
  expect(all).toContain("localhost:8081");
  expect(all).toContain("Default bundle");
  await act(async () => tree.unmount());
});

// Not deep: a View and the native view under it carry the same testID.
const byId = (tree: ReactTestRenderer, testID: string) =>
  tree.root.findAll((node) => node.props.testID === testID, { deep: false });

test("with a dev server and no rows, Show details takes no room it does not draw", async () => {
  const states = [
    // Expo's Metro: nothing after the toggle.
    () => {
      mockScriptUrl = "http://localhost:8081/index.bundle?platform=ios";
    },
    // A dev preview server picked by hand that the list has not found: Stop after it.
    () => {
      mockNativeState = {
        localServer: "http://127.0.0.1:8082/index.bundle?platform=ios",
      };
      mockScriptUrl = "http://127.0.0.1:8082/index.bundle?platform=ios";
    },
  ];
  for (const [i, setUp] of states.entries()) {
    setUp();
    const tree = await render(true);
    const [facts] = byId(tree, "hero-facts");
    // No padding under the divider, and the toggle's empty lower half goes into the gap or padding.
    expect(facts.props.style).toMatchObject({
      borderTopWidth: 1,
      paddingTop: 0,
      marginBottom: -12,
    });
    expect(byId(tree, "hero-actions")).toHaveLength(i);
    await act(async () => tree.unmount());
  }
});

test("Show details is one button, 44 high, whose chevron turns from right to down", async () => {
  mockScriptUrl = "http://localhost:8081/index.bundle?platform=ios";
  const tree = await render(true);
  const toggle = () => byId(tree, "hero-details-toggle")[0];
  const turn = () =>
    toggle().findByType(Chevron).findByType(View).props.style.transform;
  expect(toggle().props.accessibilityRole).toBe("button");
  expect(toggle().props.style.minHeight).toBeGreaterThanOrEqual(44);
  expect(toggle().props.accessibilityState).toEqual({ expanded: false });
  expect(turn()).toEqual([{ rotate: "-45deg" }]);
  const label = toggle().findByProps({ children: "Show details" });
  expect(toggle().findByType(Chevron).props.color).toBe(
    label.props.style.color,
  );
  await showDetails(tree);
  expect(toggle().props.accessibilityState).toEqual({ expanded: true });
  expect(turn()).toEqual([{ rotate: "45deg" }]);
  // Rows are in now, so they get their room under the divider.
  expect(byId(tree, "hero-facts")[0].props.style.paddingTop).toBe(8);
  await act(async () => tree.unmount());
});

test("a preview keeps its spacing: rows under the divider, the toggle, then the actions", async () => {
  mockNativeState = { bundle: "task-1/ios/main.jsbundle" };
  mockScriptUrl = "file:///data/Documents/preview/task-1/ios/main.jsbundle";
  global.fetch = bucketWithPreview();
  const tree = await render(true);
  expect(byId(tree, "hero-facts")[0].props.style).toMatchObject({
    borderTopWidth: 1,
    paddingTop: 8,
    marginBottom: 0,
  });
  expect(byId(tree, "hero-details-toggle")[0].props.style.minHeight).toBe(44);
  expect(byId(tree, "hero-actions")[0].props.style).toMatchObject({
    borderTopWidth: 1,
    paddingTop: 14,
  });
  await act(async () => tree.unmount());
});

test("the app's own bundle from a preview start server uses its title and branch", async () => {
  mockScriptUrl = "http://localhost:8082/index.bundle?platform=ios";
  global.fetch = registryWith8082();
  const tree = await render(true);
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });
  const hero = texts(tree);
  for (const text of [
    "Main-Branch",
    "localhost:8082",
    "Dev preview server",
    "Default bundle",
    "main",
  ])
    expect(hero).toContain(text);
  await act(async () => tree.unmount());
});

test("no state says 'Base' anywhere in the header", async () => {
  for (const url of [null, "http://localhost:8081/index.bundle"]) {
    mockScriptUrl = url;
    const tree = await render(true);
    expect(texts(tree).filter((t) => /\bBase\b/.test(t))).toEqual([]);
    await act(async () => tree.unmount());
  }
});

test("an app's backToBase label still names the way back, and backToDefault wins over it", async () => {
  mockNativeState = { localServer: "http://127.0.0.1:8082/index.bundle" };
  mockScriptUrl = "http://127.0.0.1:8082/index.bundle";
  for (const [labels, shown] of [
    [{ backToBase: "Back to the store build" }, "Back to the store build"],
    [{ backToBase: "Old", backToDefault: "New" }, "New"],
  ] as const) {
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
          <PreviewList labels={labels} />
        </PreviewProvider>,
      );
    });
    expect(texts(tree)).toContain(shown);
    await act(async () => tree.unmount());
  }
});

test("the refresh button asks the bucket again and has a label for screen readers", async () => {
  const tree = await render();
  const fetch = global.fetch as jest.Mock;
  const before = fetch.mock.calls.length;
  const refresh = pressable(tree, "Refresh");
  expect(refresh.props.accessibilityRole).toBe("button");
  await act(async () => refresh.props.onPress());
  expect(fetch.mock.calls.length).toBeGreaterThan(before);
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
      <PreviewProvider config={{ enabled: true, url: "" }}>
        <PreviewList />
      </PreviewProvider>,
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

test("a long name wraps to two lines at most, then ends with an ellipsis", async () => {
  mockScriptUrl = "http://localhost:8081/index.bundle?platform=ios";
  const tree = await render(true);
  const name = tree.root.find(
    (node) =>
      node.props.accessibilityRole === "header" &&
      node.props.numberOfLines !== undefined,
  );
  expect(name.props.numberOfLines).toBe(2);
  expect(name.props.ellipsizeMode).toBe("tail");
  await act(async () => tree.unmount());
});
