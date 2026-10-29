import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TurboModuleRegistry,
  View,
} from "react-native";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";

import { PreviewProvider } from "../../preview-provider/preview-provider.component";
import { PreviewList, type PreviewListProps } from "../preview-list.component";
import { LIGHT_THEME } from "../../../constants/preview-list/theme.const";
import { Card } from "../ui/card.ui";
import { Chip } from "../ui/chip.ui";
import { RowGap } from "../row-gap.component";
import { Chevron } from "../ui/chevron.ui";
import { HeroCard } from "../hero-card.component";
import { RefreshIcon } from "../ui/refresh-icon.ui";
import { devPreviewServersStore } from "../../../stores/dev-preview-servers/dev-preview-servers.store";
import {
  previewDirectory,
  writeLocalPreview,
} from "../../../services/previews/local-previews.service";
import type { IndexEntry } from "../../../utils/previews/layout.util";
import { IncompatibleRow } from "../incompatible-row.component";

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

/**
 * Metro answers as this app ("shop", named "Shop") on each of `ports`, and the registry announces
 * the `announced` ones as `preview start` servers titled "Main-Branch" on branch main.
 */
const metros = (ports: number[], announced: number[] = []) =>
  jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith(":19150/servers"))
      return Response.json({
        servers: announced.map((port) => ({
          id: String(port),
          port,
          title: "Main-Branch",
          branch: "main",
          worktree: "/w",
          slug: "shop",
          name: "Shop",
          compatibility: "appVersion",
          keys: { ios: "version-1.0.0" },
          startedAt: "",
        })),
      });
    for (const port of ports) {
      if (url.endsWith(`:${port}/status`))
        return new Response("packager-status:running");
      if (url.endsWith(`:${port}/`))
        return Response.json({
          launchAsset: {
            url: `http://localhost:${port}/index.bundle?platform=ios`,
          },
          extra: {
            expoClient: { slug: "shop", name: "Shop", version: "1.0.0" },
          },
        });
    }
    return new Response("", { status: 404 });
  }) as typeof fetch;

/** The registry announces 8082, and Metro answers there as this app ("shop"). */
const registryWith8082 = () => metros([8082], [8082]);

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

const textsOf = (node: ReactTestInstance) =>
  node
    .findAll(() => true)
    .flatMap((child) =>
      child.children.filter((c) => typeof c === "string"),
    ) as string[];

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
    "env: staging",
    "Ana",
    METRO_NOTE,
    "Use the default bundle",
  ])
    expect(all).toContain(text);
  expect(all).not.toContain("Stop server");
  expect(all).not.toContain("abc1234");
  // The header keeps its top for the name; the branch waits in the details.
  const hero = () => tree.root.findByType(HeroCard);
  expect(textsOf(hero())).not.toContain("task-1-login");
  await showDetails(tree);
  const card = textsOf(hero());
  expect(card[card.indexOf("Branch") + 1]).toBe("task-1-login");
  // The details row keeps the bare name; only the chip says "env:".
  expect(card[card.indexOf("Environment") + 1]).toBe("staging");
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
  expect(texts(tree)).not.toContain("env: staging");
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
  expect(all).toContain("Preview server");
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
  // Metro answers on 8081 as this app, so the scan finds it.
  global.fetch = metros([8081]);
  const tree = await render(true);
  await settle();
  const all = textsOf(tree.root.findByType(HeroCard));
  // Metro only knows the app's name, so the default is called by its role.
  expect(all).toContain("Default");
  expect(all).not.toContain("Shop");
  expect(all).toContain("Default bundle");
  expect(all).not.toContain("Use the default bundle");
  expect(byId(tree, "hero-actions")).toEqual([]);
  // Each kind has its own hue, the default included.
  const chip = tree.root
    .findByType(HeroCard)
    .find((node) => node.props.text === "Expo server");
  expect(chip.props.tone).toBe("info");
  await act(async () => tree.unmount());
});

/** Lets the first look for servers land. */
const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 50));
  });

/** The row of the server on `port`, whatever host the scan found it on. */
const serverRow = (tree: ReactTestRenderer, port: number) => {
  const [row] = tree.root.findAll(
    (node) =>
      typeof node.props.testID === "string" &&
      node.props.testID.startsWith("server-") &&
      node.props.testID.endsWith(`:${port}`),
    { deep: false },
  );
  return row;
};

const separators = (row: ReactTestInstance) =>
  row.findAll((n) => n.props.testID === "group-separator", { deep: false })
    .length;

/** The server the app runs from: tinted and selected, with no chevron and nothing to press. */
const expectActive = (row: ReactTestInstance) => {
  expect(row.findByType(Card).props.tinted).toBe(true);
  expect(row.props.accessibilityState).toEqual({ selected: true });
  expect(row.props.onPress).toBeUndefined();
  expect(row.findAllByType(Chevron)).toEqual([]);
  expect(textsOf(row)).toContain("Active");
};

/** Any other server: the whole row is a button, with a chevron. */
const expectSwitchable = (row: ReactTestInstance) => {
  expect(row.findByType(Card).props.tinted).toBeFalsy();
  expect(row.props.accessibilityRole).toBe("button");
  expect(typeof row.props.onPress).toBe("function");
  expect(row.findAllByType(Chevron)).toHaveLength(1);
  expect(textsOf(row)).not.toContain("Active");
};

test("the default Metro, with nothing picked, is Active and titled Default", async () => {
  mockScriptUrl = "http://localhost:8081/index.bundle?platform=ios";
  global.fetch = metros([8081, 8083]);
  const tree = await render(true);
  await settle();
  const row = serverRow(tree, 8081);
  expectActive(row);
  for (const text of ["Default", "localhost:8081", "Expo server"])
    expect(textsOf(row)).toContain(text);
  expect(row.props.accessibilityLabel).toBe(
    "Default, localhost:8081, Active, Expo server",
  );
  // Another server Metro found with no title of its own keeps the app's name.
  const other = serverRow(tree, 8083);
  expectSwitchable(other);
  expect(textsOf(other)).toEqual(
    expect.arrayContaining(["Shop", "localhost:8083"]),
  );
  expect(textsOf(other)).not.toContain("Default");
  expect(textsOf(tree.root.findByType(HeroCard))).toContain("Default");
  // One grouped card: square where the rows meet, a hairline only between them, no gap.
  expect(row.findByType(Card).props.position).toBe("first");
  expect(other.findByType(Card).props.position).toBe("last");
  expect(separators(row)).toBe(0);
  expect(separators(other)).toBe(1);
  const gaps = tree.root.findAllByType(RowGap);
  const after = (port: number) =>
    gaps.find(
      (g) =>
        g.props.leadingItem?.type === "dev-server" &&
        g.props.leadingItem.server.port === port,
    );
  expect(after(8081)?.children).toEqual([]);
  expect(after(8083)?.children).toHaveLength(1);
  await act(async () => tree.unmount());
});

test("a server picked by hand is Active; pressing the default Metro's row switches to it", async () => {
  mockNativeState = {
    localServer: "http://127.0.0.1:8082/index.bundle?platform=ios",
    defaultServer: "localhost:8081",
  };
  mockScriptUrl = "http://127.0.0.1:8082/index.bundle?platform=ios";
  global.fetch = metros([8081, 8082], [8082]);
  const tree = await render(true);
  await settle();
  const picked = serverRow(tree, 8082);
  expectActive(picked);
  expect(textsOf(picked)).toEqual(
    expect.arrayContaining(["Main-Branch", "Preview server"]),
  );
  // The branch is a quote line right under the address, not a chip.
  const said = textsOf(picked);
  expect(said.slice(said.indexOf("localhost:8082") + 1).slice(0, 2)).toEqual([
    "Branch: ",
    "main",
  ]);
  const chips = picked.findAllByType(Chip);
  expect(chips.map((chip) => [chip.props.text, chip.props.tone])).toEqual([
    ["Active", "success"],
    ["Preview server", "accent2"],
  ]);
  expect(picked.props.accessibilityLabel).toBe(
    "Main-Branch, localhost:8082, Branch main, Active, Preview server",
  );
  expect(said).not.toContain("Expo server");
  const fallback = serverRow(tree, 8081);
  expectSwitchable(fallback);
  expect(textsOf(fallback)).toEqual(
    expect.arrayContaining(["Default", "Expo server"]),
  );
  expect(fallback.props.accessibilityLabel).toBe(
    "Switch to Default, localhost:8081, Expo server",
  );
  expect(fallback.props.accessibilityHint).toBe(
    "Restarts the app on this server.",
  );
  mockSelectLocalServer.mockClear();
  await act(async () => fallback.props.onPress());
  expect(mockSelectLocalServer).toHaveBeenCalledWith(
    expect.stringContaining(":8081/"),
    expect.stringMatching(/:8081$/),
  );
  await act(async () => tree.unmount());
});

test("a preview start server that is the default Metro keeps its own title", async () => {
  mockScriptUrl = "http://localhost:8082/index.bundle?platform=ios";
  global.fetch = registryWith8082();
  const tree = await render(true);
  await settle();
  const row = serverRow(tree, 8082);
  expectActive(row);
  expect(textsOf(row)).toEqual(
    expect.arrayContaining(["Main-Branch", "Preview server"]),
  );
  expect(texts(tree)).not.toContain("Default");
  await act(async () => tree.unmount());
});

test("no server is Active while a preview runs", async () => {
  mockNativeState = { bundle: "task-1/ios/main.jsbundle" };
  mockScriptUrl = "file:///data/Documents/preview/task-1/ios/main.jsbundle";
  global.fetch = metros([8081]);
  const tree = await render(true);
  await settle();
  expectSwitchable(serverRow(tree, 8081));
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
  expect(all).toContain("Expo server");
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
  await settle();
  const hero = texts(tree);
  for (const text of [
    "Main-Branch",
    "localhost:8082",
    "Preview server",
    "Default bundle",
  ])
    expect(hero).toContain(text);
  // Not at the top of the header: the branch is a Branch row in the details.
  expect(textsOf(tree.root.findByType(HeroCard))).not.toContain("main");
  await showDetails(tree);
  const card = textsOf(tree.root.findByType(HeroCard));
  expect(card[card.indexOf("Branch") + 1]).toBe("main");
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

test("the refresh icon is drawn, not a font glyph, so it sits in the middle on Android too", async () => {
  const tree = await render();
  const refresh = pressable(tree, "Refresh");
  expect(refresh.findAllByType(RefreshIcon)).toHaveLength(1);
  expect(refresh.findAllByType(Text)).toEqual([]);
  expect(texts(tree)).not.toContain("\u21bb");
  await act(async () => tree.unmount());
});

const REFUSED =
  "fetch failed: java.net.ConnectException: Failed to connect to localhost/127.0.0.1:9000";
const refused = () =>
  jest.fn(async () => {
    throw new TypeError(REFUSED);
  }) as unknown as typeof fetch;
const EMULATOR_HINT = "On the Android emulator, use 10.0.2.2";
/** A node's text in order, nested spans included, as one string. */
const flat = (node: ReactTestInstance | string): string =>
  typeof node === "string" ? node : node.children.map(flat).join("");
const bannerButtons = (tree: ReactTestRenderer) =>
  byId(tree, "list-error")[0]
    .findAll((n) => n.props.accessibilityRole === "button", { deep: false })
    .map(flat);

test("a list error shows plainly in a banner above the header card, never in the card", async () => {
  global.fetch = refused();
  const tree = await render();
  const [banner] = byId(tree, "list-error");
  expect(banner.props.accessibilityRole).toBe("alert");
  const said = banner
    .findAll(() => true)
    .flatMap((n) => n.children.filter((c) => typeof c === "string"));
  expect(said).toContain("Can't reach the bucket at localhost:9000.");
  // Not on iOS, where localhost is the computer.
  expect(said.join(" ")).not.toContain(EMULATOR_HINT);
  const all = texts(tree);
  expect(all).not.toContain(REFUSED);
  const card = tree.root.findByType(HeroCard);
  expect(
    card.findAll((n) =>
      n.children.some((c) => typeof c === "string" && c.includes("bucket")),
    ),
  ).toEqual([]);
  // Above the card: the banner's text comes first.
  expect(all.indexOf("Can't reach the bucket at localhost:9000.")).toBeLessThan(
    all.indexOf("Built into the app"),
  );
  await act(async () => tree.unmount());
});

test("Dismiss then Retry, at the end of the banner: Retry asks again and Dismiss puts it away", async () => {
  global.fetch = refused();
  const tree = await render();
  expect(bannerButtons(tree)).toEqual(["Dismiss", "Retry"]);
  const fetch = global.fetch as jest.Mock;
  const before = fetch.mock.calls.length;
  await act(async () => pressable(tree, "Retry").props.onPress());
  expect(fetch.mock.calls.length).toBeGreaterThan(before);
  expect(byId(tree, "list-error")).toHaveLength(1);
  await act(async () => pressable(tree, "Dismiss").props.onPress());
  expect(byId(tree, "list-error")).toEqual([]);
  await act(async () => tree.unmount());
});

test("on Android, a bucket on localhost gets the emulator hint on its own line, with the command set apart", async () => {
  const android = jest.replaceProperty(Platform, "OS", "android");
  try {
    global.fetch = refused();
    const tree = await render();
    const [banner] = byId(tree, "list-error");
    const [message] = banner.findAllByType(Text);
    const [hint] = byId(tree, "list-error-hint");
    expect(flat(message)).toBe("Can't reach the bucket at localhost:9000.");
    expect(flat(hint)).toBe(
      `${EMULATOR_HINT}, or run adb reverse tcp:9000 tcp:9000.`,
    );
    const command = hint
      .findAllByType(Text)
      .find((t) => flat(t) === "adb reverse tcp:9000 tcp:9000");
    expect(StyleSheet.flatten(command?.props.style).fontFamily).toBe(
      "monospace",
    );
    await act(async () => tree.unmount());
  } finally {
    android.restore();
  }
});

test("an app's labels from before the split still show, with no second line under them", async () => {
  global.fetch = jest.fn(async () => {
    throw new Error("AccessDenied");
  }) as unknown as typeof fetch;
  const tree = await renderWith({
    labels: { errorForbidden: "Kein Zugriff.", dismiss: "Schließen" },
  });
  expect(texts(tree)).toContain("Kein Zugriff.");
  expect(byId(tree, "list-error-hint")).toEqual([]);
  expect(bannerButtons(tree)).toEqual(["Schließen", "Retry"]);
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
  const [hint] = byId(tree, "list-error-hint");
  expect(flat(hint)).toContain("No bucket URL. Set url in the preview config");
  // Asking again can't help: the URL is in the build.
  expect(bannerButtons(tree)).toEqual(["Dismiss"]);
  await act(async () => tree.unmount());
});

test("pulling the list down asks the bucket again", async () => {
  const tree = await render();
  const fetch = global.fetch as jest.Mock;
  const before = fetch.mock.calls.length;
  const pull = tree.root.findByType(FlatList).props.refreshControl;
  // The spinner takes the theme's colours.
  expect(pull.props).toMatchObject({
    colors: [LIGHT_THEME.primary],
    tintColor: LIGHT_THEME.muted,
  });
  await act(async () => pull.props.onRefresh());
  expect(fetch.mock.calls.length).toBeGreaterThan(before);
  await act(async () => tree.unmount());
});

async function renderWith(props: PreviewListProps) {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      <PreviewProvider
        config={{ enabled: true, url: "http://localhost:9000/b" }}
      >
        <PreviewList {...props} />
      </PreviewProvider>,
    );
  });
  return tree;
}

test("the app's style and contentContainerStyle reach the FlatList and win over the list's own", async () => {
  const tree = await renderWith({
    style: { backgroundColor: "#ff0000", flex: 1 },
    contentContainerStyle: { paddingBottom: 200 },
  });
  const list = tree.root.findByType(FlatList).props;
  expect(StyleSheet.flatten(list.style)).toEqual({
    backgroundColor: "#ff0000",
    flex: 1,
  });
  expect(StyleSheet.flatten(list.contentContainerStyle)).toEqual({
    padding: 16,
    paddingBottom: 200,
  });
  await act(async () => tree.unmount());
});

test("by default the end of the list clears a floating tab bar", async () => {
  const tree = await render();
  const list = tree.root.findByType(FlatList).props;
  expect(StyleSheet.flatten(list.contentContainerStyle).paddingBottom).toBe(
    112,
  );
  await act(async () => tree.unmount());
});

test("the app's header sits above the list's own, and its footer after the last row", async () => {
  const tree = await renderWith({
    ListHeaderComponent: <Text>App header</Text>,
    ListFooterComponent: () => <Text>App footer</Text>,
  });
  const all = texts(tree);
  expect(all.indexOf("App header")).toBeLessThan(
    all.indexOf("Built into the app"),
  );
  expect(all.at(-1)).toBe("App footer");
  expect(all.indexOf("App footer")).toBeGreaterThan(
    all.indexOf("Published previews"),
  );
  await act(async () => tree.unmount());
});

test("other FlatList props are passed through", async () => {
  const onScroll = jest.fn();
  const tree = await renderWith({
    testID: "qa-previews",
    showsVerticalScrollIndicator: false,
    onScroll,
  });
  const list = tree.root.findByType(FlatList).props;
  expect(list).toMatchObject({
    testID: "qa-previews",
    showsVerticalScrollIndicator: false,
    onScroll,
  });
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

/** A download kept from an older native build. */
async function downloadedForOldBuild(id: string, title: string) {
  previewDirectory(id, "ios").create({ intermediates: true });
  await writeLocalPreview({
    id,
    platform: "ios",
    key: "version-0.9.0",
    revision: "r1",
    downloadedAt: "2026-09-01T10:00:00.000Z",
    entry: {
      id,
      title,
      branch: `${id}-branch`,
      author: "Ana",
      publishedAt: "2026-09-01T09:00:00.000Z",
      size: 2048,
      changelog: "",
      environment: id === "old-1" ? "staging" : undefined,
    } as IndexEntry,
  });
}

test("downloads for another build: one grouped card, and a quiet Delete all that clears them", async () => {
  await downloadedForOldBuild("old-1", "Checkout v1");
  await downloadedForOldBuild("old-2", "Search v1");
  const tree = await render();
  expect(texts(tree)).toContain("Incompatible");
  expect(texts(tree)).toContain(
    "Made for another native build, so they can't run here.",
  );
  const rows = tree.root.findAllByType(IncompatibleRow);
  expect(rows.map((r) => r.props.position)).toEqual(["first", "last"]);
  const [first, second] = rows.map((r) => textsOf(r));
  expect(first).toEqual(
    expect.arrayContaining([
      "Checkout v1",
      "old-1-branch",
      "env: staging",
      "2 KB",
    ]),
  );
  expect(second).not.toContain("env: staging");
  // Nothing to switch to on a row.
  expect(
    rows[0].findAll((n) => n.props.accessibilityRole === "button"),
  ).toEqual([]);
  const [deleteAll] = tree.root.findAll(
    (n) =>
      n.props.accessibilityLabel === "Delete all, Incompatible" &&
      n.props.accessibilityRole === "button",
  );
  expect(deleteAll.props.style({ pressed: false })).toMatchObject({
    minHeight: 44,
    borderWidth: 0,
  });
  await act(async () => deleteAll.props.onPress());
  expect(tree.root.findAllByType(IncompatibleRow)).toEqual([]);
  expect(texts(tree)).not.toContain("Incompatible");
  await act(async () => tree.unmount());
});
