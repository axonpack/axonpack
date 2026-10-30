import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import type { PreviewListLabels } from "../preview-list.types";
import { LIGHT_THEME } from "../../../constants/preview-list/theme.const";
import { Card } from "../ui/card.ui";
import { Chip } from "../ui/chip.ui";
import { HostIcon } from "../ui/host-icon.ui";
import { HintRow } from "../hint-row.component";
import type { PreviewConfig } from "../../../utils/config/config.util";
import { ChipRow } from "../ui/chip-row.ui";
import { RowGap } from "../row-gap.component";
import { Chevron } from "../ui/chevron.ui";
import { HeroCard } from "../hero-card.component";
import { RefreshIcon } from "../ui/refresh-icon.ui";
import { Scanning } from "../ui/scanning.ui";
import { devPreviewServersStore } from "../../../stores/dev-preview-servers/dev-preview-servers.store";
import { File } from "expo-file-system";

import {
  previewDirectory,
  rootDirectory,
  writeLocalPreview,
} from "../../../services/previews/local-previews.service";
import type { IndexEntry } from "../../../utils/previews/layout.util";
import { IncompatibleRow } from "../incompatible-row.component";
import type { NativeLoaded } from "../../../services/native/native.service";

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
  loaded?: NativeLoaded;
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
  // What an earlier test saved about the server it ran from, and the hosts it added.
  new File(rootDirectory(), "server.json").delete();
  new File(rootDirectory(), "hosts.json").delete();
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

async function render(devPreviewServers?: PreviewConfig["devPreviewServers"]) {
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

test("a spinner follows the section's title only while every port is asked, at the same height", async () => {
  const tree = await render(true);
  await settle();
  const scanning = () => tree.root.findByType(Scanning);
  expect(scanning().props.visible).toBe(false);
  let sweep!: Promise<void>;
  act(() => {
    sweep = devPreviewServersStore.refresh();
  });
  expect(scanning().props.visible).toBe(true);
  // A spinner right after the title, which a screen reader calls Scanning.
  expect(textsOf(scanning())).toEqual([]);
  const spinner = scanning().findByType(View);
  expect(spinner.props.accessibilityLabel).toBe("Scanning…");
  expect(spinner.props.accessible).toBe(true);
  const titleLine = scanning().parent!;
  expect(textsOf(titleLine)).toEqual(["Dev preview servers"]);
  expect(titleLine.children.at(-1)).toBe(scanning());
  await act(() => sweep);
  // Still laid out, only faded, so the heading does not shift.
  expect(scanning().props.visible).toBe(false);
  expect(
    StyleSheet.flatten(scanning().findByType(View).props.style),
  ).toMatchObject({ opacity: 0 });
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
  "Debug build: Metro is not used while a preview runs. Back to default loads from Metro again.";

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
    "Back to default",
  ])
    expect(all).toContain(text);
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
  // No look has found it, so its kind is not known: a plain chip, and its address for a title.
  expect(all).toContain("Server");
  expect(all).not.toContain("Preview server");
  expect(textsOf(tree.root.findByType(HeroCard))[0]).toBe("localhost:8082");
  // One machine, one name.
  expect(all).toContain("localhost:8082");
  expect(all).not.toContain("127.0.0.1:8082");
  expect(all.filter((t) => t === "Back to default")).toHaveLength(1);
  expect(all).not.toContain(METRO_NOTE);
  await act(async () => tree.unmount());
});

test("a server picked by hand, with no preview chosen, offers Back to default, which clears it", async () => {
  mockNativeState = {
    localServer: "http://127.0.0.1:8082/index.bundle?platform=ios",
  };
  mockScriptUrl = "http://127.0.0.1:8082/index.bundle?platform=ios";
  const tree = await render(true);
  mockSelectLocalServer.mockClear();
  await act(async () => pressable(tree, "Back to default").props.onPress());
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
  expect(all).toContain("Default server");
  expect(all).not.toContain("Back to default");
  expect(byId(tree, "hero-actions")).toEqual([]);
  // Each kind has its own hue, the default included.
  const chip = tree.root
    .findByType(HeroCard)
    .find((node) => node.props.text === "server: Expo");
  expect(chip.props.tone).toBe("info");
  expect(chip.props.accessibilityLabel).toBe("Expo server");
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
  for (const text of ["Default", "localhost:8081", "server: Expo"])
    expect(textsOf(row)).toContain(text);
  expect(row.props.accessibilityLabel).toBe(
    "Default, localhost:8081, Active, Expo server, Default server",
  );
  // Metro knows only the app's name, which every server of the app shares, so another server
  // with no title of its own goes by its address, once.
  const other = serverRow(tree, 8083);
  expectSwitchable(other);
  expect(textsOf(other)).toEqual(["localhost:8083", "server: Expo"]);
  expect(textsOf(tree.root.findByType(HeroCard))).toContain("Default");
  // One grouped card with the hosts at its end: square where the rows meet, a hairline only
  // between them, no gap.
  expect(row.findByType(Card).props.position).toBe("first");
  expect(other.findByType(Card).props.position).toBe("middle");
  expect(byId(tree, "dev-server-hosts")[0].props.position).toBe("last");
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
  expect(after(8083)?.children).toEqual([]);
  const afterHosts = gaps.find(
    (g) => g.props.leadingItem?.type === "dev-server-hosts",
  );
  expect(afterHosts?.children).toHaveLength(1);
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
    expect.arrayContaining(["Main-Branch", "server: Preview"]),
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
    ["server: Preview", "accent2"],
  ]);
  expect(picked.props.accessibilityLabel).toBe(
    "Main-Branch, localhost:8082, Branch main, Active, Preview server",
  );
  expect(said).not.toContain("server: Expo");
  const fallback = serverRow(tree, 8081);
  expectSwitchable(fallback);
  expect(textsOf(fallback)).toEqual(
    expect.arrayContaining(["Default", "server: Expo"]),
  );
  expect(fallback.props.accessibilityLabel).toBe(
    "Switch to Default, localhost:8081, Expo server, Default server",
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

test("the default Metro's row says Default server whether it runs or not, and no other row does", async () => {
  mockNativeState = {
    localServer: "http://127.0.0.1:8082/index.bundle?platform=ios",
    defaultServer: "localhost:8081",
  };
  mockScriptUrl = "http://127.0.0.1:8082/index.bundle?platform=ios";
  global.fetch = metros([8081, 8082, 8083], [8082]);
  const tree = await render(true);
  await settle();
  const chips = (port: number) =>
    serverRow(tree, port)
      .findAllByType(Chip)
      .map((chip) => [chip.props.text, chip.props.tone]);
  // Not running, but still the default: Metro knows no name for it, so it is titled Default.
  expect(textsOf(serverRow(tree, 8081))).toContain("Default");
  expect(chips(8081)).toEqual([
    ["server: Expo", "info"],
    ["Default server", undefined],
  ]);
  expect(chips(8082)).toEqual([
    ["Active", "success"],
    ["server: Preview", "accent2"],
  ]);
  expect(chips(8083)).toEqual([["server: Expo", "info"]]);
  await act(async () => tree.unmount());
});

test("the header's and the server rows' chips scroll sideways, and a server row still switches from anywhere", async () => {
  mockNativeState = {
    localServer: "http://127.0.0.1:8082/index.bundle?platform=ios",
    defaultServer: "localhost:8081",
  };
  mockScriptUrl = "http://127.0.0.1:8082/index.bundle?platform=ios";
  global.fetch = metros([8081, 8082], [8082]);
  const tree = await render(true);
  await settle();
  const chipsIn = (row: ReactTestInstance) =>
    row.findAllByType(Chip).map((chip) => chip.props.text);
  const [heroRow] = tree.root.findByType(HeroCard).findAllByType(ChipRow);
  expect(chipsIn(heroRow)).toEqual(["server: Preview"]);
  expect(heroRow.findByType(ScrollView).props.horizontal).toBe(true);
  // The switchable row is the button, the chips' line inside it included.
  const fallback = serverRow(tree, 8081);
  expectSwitchable(fallback);
  const line = fallback.findByType(ChipRow);
  expect(chipsIn(line)).toEqual(["server: Expo", "Default server"]);
  const scroll = line.findByType(ScrollView);
  expect(scroll.props.horizontal).toBe(true);
  // It stops at the chevron instead of sliding under it.
  expect(scroll.props.style.marginLeft).toBe(-16);
  expect(scroll.props.style.marginRight).toBeCloseTo(0);
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
    expect.arrayContaining(["Main-Branch", "server: Preview"]),
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

const offlineChips = (node: ReactTestInstance) =>
  node.findAllByType(Chip).filter((chip) => chip.props.text === "Offline");

test("the default Metro that stops answering keeps its row and says so, until it answers again", async () => {
  mockScriptUrl = "http://localhost:8081/index.bundle?platform=ios";
  global.fetch = metros([8081, 8082], [8082]);
  const tree = await render(true);
  await settle();
  const hero = () => tree.root.findByType(HeroCard);
  expect(offlineChips(tree.root).length).toBe(0);

  // Metro stops, so the next look does not find 8081.
  global.fetch = metros([8082], [8082]);
  await act(() => devPreviewServersStore.refresh());
  const row = serverRow(tree, 8081);
  expectActive(row);
  expect(
    row.findAllByType(Chip).map((chip) => [chip.props.text, chip.props.tone]),
  ).toEqual([
    ["Active", "success"],
    ["Offline", "danger"],
    ["server: Expo", "info"],
    ["Default server", undefined],
  ]);
  expect(row.props.accessibilityLabel).toBe(
    "Default, localhost:8081, Active, Offline, Expo server, Default server",
  );
  expectSwitchable(serverRow(tree, 8082));
  expect(
    hero()
      .findAllByType(Chip)
      .map((chip) => chip.props.text),
  ).toEqual(["server: Expo", "Offline", "Default server"]);
  expect(offlineChips(hero())[0].props.tone).toBe("danger");
  expect(textsOf(hero())).toContain("Start Metro again, then reload.");

  global.fetch = metros([8081, 8082], [8082]);
  await act(() => devPreviewServersStore.refresh());
  expect(offlineChips(tree.root).length).toBe(0);
  expect(byId(tree, "hero-offline-hint").length).toBe(0);
  expectActive(serverRow(tree, 8081));
  await act(async () => tree.unmount());
});

test("a chosen preview that did not load, on a stopped default Metro, offers no way back that reloads it", async () => {
  mockNativeState = {
    bundle: "task-1/ios/main.jsbundle",
    loaded: { kind: "default" },
  };
  mockScriptUrl = "http://localhost:8081/index.bundle?platform=ios";
  const tree = await render(true);
  await settle();
  expect(offlineChips(tree.root.findByType(HeroCard))).toHaveLength(1);
  expect(byId(tree, "hero-actions").length).toBe(0);
  await act(async () => tree.unmount());
});

test("a picked server that stops answering keeps its name, and Back to default still shows", async () => {
  mockNativeState = {
    localServer: "http://127.0.0.1:8082/index.bundle?platform=ios",
    defaultServer: "localhost:8081",
  };
  mockScriptUrl = "http://127.0.0.1:8082/index.bundle?platform=ios";
  global.fetch = metros([8081, 8082], [8082]);
  const tree = await render(true);
  await settle();
  // `preview start` stopped: the registry no longer has it, and Metro does not answer.
  global.fetch = metros([8081]);
  await act(() => devPreviewServersStore.refresh());
  const picked = serverRow(tree, 8082);
  expectActive(picked);
  expect(textsOf(picked)).toEqual(
    expect.arrayContaining(["Main-Branch", "Offline", "server: Preview"]),
  );
  const hero = textsOf(tree.root.findByType(HeroCard));
  expect(hero).toEqual(
    expect.arrayContaining([
      "Main-Branch",
      "Offline",
      "Start this server again, or go back to default.",
      "Back to default",
    ]),
  );
  await act(async () => tree.unmount());
});

test("a stopped preview start server keeps its title, branch and kind, after a reload too", async () => {
  mockNativeState = {
    localServer: "http://127.0.0.1:8083/index.bundle?platform=ios",
    defaultServer: "localhost:8081",
  };
  mockScriptUrl = "http://127.0.0.1:8083/index.bundle?platform=ios";
  global.fetch = metros([8081, 8083], [8083]);
  const first = await render(true);
  await settle();
  await act(async () => first.unmount());
  // A reload: the store starts with no servers, then `preview start` on 8083 stops (it leaves the
  // registry too).
  global.fetch = metros([8081]);
  const scriptUrl = mockScriptUrl;
  mockScriptUrl = null;
  await devPreviewServersStore.refresh();
  expect(devPreviewServersStore.getState().servers).toHaveLength(1);
  mockScriptUrl = scriptUrl;
  const tree = await render(true);
  await settle();
  const row = serverRow(tree, 8083);
  expectActive(row);
  expect(textsOf(row)).toEqual(
    expect.arrayContaining(["Main-Branch", "localhost:8083", "main"]),
  );
  expect(row.findAllByType(Chip).map((chip) => chip.props.text)).toEqual([
    "Active",
    "Offline",
    "server: Preview",
  ]);
  const hero = textsOf(tree.root.findByType(HeroCard));
  expect(hero).toEqual(
    expect.arrayContaining(["Main-Branch", "server: Preview", "Offline"]),
  );
  expect(texts(tree)).not.toContain("Shop");
  await act(async () => tree.unmount());
});

test("a stopped server nothing is known about goes by its address, with no kind", async () => {
  mockNativeState = {
    localServer: "http://127.0.0.1:8083/index.bundle?platform=ios",
    defaultServer: "localhost:8081",
  };
  mockScriptUrl = "http://127.0.0.1:8083/index.bundle?platform=ios";
  global.fetch = metros([8081]);
  const tree = await render(true);
  await settle();
  const row = serverRow(tree, 8083);
  expectActive(row);
  expect(textsOf(row)[0]).toBe("localhost:8083");
  expect(
    row.findAllByType(Chip).map((chip) => [chip.props.text, chip.props.tone]),
  ).toEqual([
    ["Active", "success"],
    ["Offline", "danger"],
    ["Server", "neutral"],
  ]);
  const hero = tree.root.findByType(HeroCard);
  expect(textsOf(hero)[0]).toBe("localhost:8083");
  expect(hero.findAllByType(Chip).map((chip) => chip.props.text)).toEqual([
    "Server",
    "Offline",
  ]);
  // No guess at a kind or a name.
  for (const guess of ["Shop", "Default", "server: Expo", "server: Preview"]) {
    expect(textsOf(row)).not.toContain(guess);
    expect(textsOf(hero)).not.toContain(guess);
  }
  await act(async () => tree.unmount());
});

test("before the first look finishes, nothing says Offline", async () => {
  mockScriptUrl = "http://localhost:8081/index.bundle?platform=ios";
  let answer!: () => void;
  const held = new Promise<void>((resolve) => {
    answer = resolve;
  });
  const live = metros([8081]);
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    await held;
    return live(input);
  }) as typeof fetch;
  const tree = await render(true);
  // An earlier look found nothing, which read alone would say the server is offline.
  expect(offlineChips(tree.root).length).toBe(0);
  expect(byId(tree, "hero-offline-hint").length).toBe(0);
  await act(async () => {
    answer();
    await new Promise((r) => setTimeout(r, 50));
  });
  expect(offlineChips(tree.root).length).toBe(0);
  expectActive(serverRow(tree, 8081));
  await act(async () => tree.unmount());
});

describe("the header card and the preview rows agree on what runs", () => {
  const METRO_8081 = "http://127.0.0.1:8081/index.bundle?platform=ios";
  const METRO_8082 = "http://127.0.0.1:8082/index.bundle?platform=ios";
  const previewRow = (tree: ReactTestRenderer) =>
    tree.root.findAll((node) => node.props.testID === "preview-task-1")[0];
  const header = (tree: ReactTestRenderer) =>
    textsOf(tree.root.findByType(HeroCard));

  test("a preview native loaded runs in both, whatever the file's path says", async () => {
    mockNativeState = {
      bundle: "task-1/ios/main.jsbundle",
      loaded: { kind: "preview", id: "task-1" },
    };
    mockScriptUrl = "file:///private/var/copy/main.jsbundle";
    global.fetch = bucketWithPreview();
    const tree = await render(true);
    expect(header(tree)).toContain("Login fix");
    expect(textsOf(previewRow(tree))).toContain("Active");
    await act(async () => tree.unmount());
  });

  test("a chosen preview under a picked server: the server runs, and the preview is not Active", async () => {
    mockNativeState = {
      bundle: "task-1/ios/main.jsbundle",
      localServer: METRO_8082,
      defaultServer: "localhost:8081",
      loaded: { kind: "server", url: METRO_8082 },
    };
    mockScriptUrl = METRO_8082;
    global.fetch = bucketWithPreview();
    const tree = await render(true);
    expect(header(tree)).toContain("localhost:8082");
    expect(header(tree)).not.toContain("Login fix");
    expect(textsOf(previewRow(tree))).not.toContain("Active");
    await act(async () => tree.unmount());
  });

  test("a chosen preview that did not load leaves the default in both", async () => {
    // The default Metro was picked by hand, so it wins over the preview chosen after it.
    mockNativeState = {
      bundle: "task-1/ios/main.jsbundle",
      localServer: METRO_8081,
      defaultServer: "localhost:8081",
      loaded: { kind: "server", url: METRO_8081 },
    };
    mockScriptUrl = METRO_8081;
    global.fetch = bucketWithPreview();
    const tree = await render(true);
    expect(header(tree)).toContain("Default");
    expect(header(tree)).not.toContain("Login fix");
    expect(textsOf(previewRow(tree))).not.toContain("Active");
    await act(async () => tree.unmount());
  });
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
  expect(all).not.toContain("Back to default");
  // A bundle, not a server.
  expect(all).not.toContain("Default server");
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
  global.fetch = metros([8081]);
  const tree = await render(true);
  await settle();
  const all = texts(tree);
  expect(all).toContain("server: Expo");
  expect(all).toContain("localhost:8081");
  expect(all).toContain("Default server");
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
    "server: Preview",
    "Default server",
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

async function renderConfig(config: PreviewConfig) {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      <PreviewProvider config={config}>
        <PreviewList />
      </PreviewProvider>,
    );
  });
  return tree;
}

test("with no bucket URL, Published previews says previews aren't set up, with no error, and dev servers still show", async () => {
  for (const bucket of [
    {},
    { s3Config: { url: undefined as unknown as string } },
    { s3Config: { url: "" } },
    { s3Config: { url: "  " } },
    { url: "  " },
  ]) {
    const tree = await renderConfig({
      enabled: true,
      devPreviewServers: true,
      ...bucket,
    });
    const all = texts(tree);
    expect(all).toContain("Previews aren't set up");
    expect(all).toContain(
      "Add s3Config.url to the preview config to list published previews.",
    );
    // One calm row in a card, under the section's heading.
    const [row] = byId(tree, "previews-not-configured");
    expect(row.type).toBe(Card);
    expect(all.indexOf("Published previews")).toBeLessThan(
      all.indexOf("Previews aren't set up"),
    );
    expect(all).not.toContain("No previews published for this build yet.");
    expect(byId(tree, "list-error")).toEqual([]);
    expect(all).toContain("Dev preview servers");
    expect(all).toContain(
      "No Metro server found. Start one with npx preview start.",
    );
    tree.root.findByType(HeroCard);
    const asked = (global.fetch as jest.Mock).mock.calls.map(([u]) =>
      String(u),
    );
    expect(asked.filter((u) => u.includes("/index/"))).toEqual([]);
    await act(async () => tree.unmount());
  }
});

test("a relative bucket URL is set but wrong, so it still says which setting to fix", async () => {
  for (const url of ["/previews", "localhost:9000/b"]) {
    const tree = await renderConfig({ enabled: true, s3Config: { url } });
    expect(texts(tree)).not.toContain("Previews aren't set up");
    expect(byId(tree, "previews-not-configured")).toEqual([]);
    const [hint] = byId(tree, "list-error-hint");
    expect(flat(hint)).toContain(
      `The bucket URL "${url}" is not a full address`,
    );
    // Asking again can't help: the URL is in the build.
    expect(bannerButtons(tree)).toEqual(["Dismiss"]);
    await act(async () => tree.unmount());
  }
});

test("a bucket URL that arrives in a new config starts the reads, and the not set up row goes", async () => {
  global.fetch = bucketWithPreview();
  const tree = await renderConfig({ enabled: true, s3Config: { url: "" } });
  expect(byId(tree, "previews-not-configured")).toHaveLength(1);
  const asked = () =>
    (global.fetch as jest.Mock).mock.calls
      .map(([u]) => String(u))
      .filter((u) => u.includes("/index/"));
  expect(asked()).toEqual([]);
  await act(async () =>
    tree.update(
      <PreviewProvider
        config={{ enabled: true, s3Config: { url: "http://localhost:9000/b" } }}
      >
        <PreviewList />
      </PreviewProvider>,
    ),
  );
  expect(asked()).toEqual([
    "http://localhost:9000/b/index/ios/version-1.0.0.json",
  ]);
  expect(byId(tree, "previews-not-configured")).toEqual([]);
  expect(texts(tree)).toContain("Login fix");
  expect(byId(tree, "list-error")).toEqual([]);
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
  expect(
    rows[0].findByType(ChipRow).findByType(ScrollView).props.horizontal,
  ).toBe(true);
  expect(rows[1].findAllByType(ChipRow)).toEqual([]);
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

test("an app's own status labels still show on the chip, and statusShort wins over them", async () => {
  global.fetch = bucketWithPreview();
  const status = { available: "Nicht geladen" } as PreviewListLabels["status"];
  for (const [labels, shown] of [
    [{ status }, "status: nicht geladen"],
    [{ status, statusShort: { ...status, available: "Neu" } }, "status: neu"],
  ] as const) {
    const tree = await renderWith({ labels });
    expect(texts(tree)).toContain(shown);
    await act(async () => tree.unmount());
  }
});

describe("the hosts at the end of the dev servers card", () => {
  const hostsBlock = (tree: ReactTestRenderer) =>
    byId(tree, "dev-server-hosts")[0];
  const toggle = (tree: ReactTestRenderer) => byId(tree, "hosts-toggle")[0];
  const hostNames = (tree: ReactTestRenderer) =>
    byId(tree, "host-row").map((row) => textsOf(row)[0]);
  const removeButtons = (tree: ReactTestRenderer) =>
    hostsBlock(tree).findAll(
      (n) =>
        typeof n.props.onPress === "function" &&
        String(n.props.accessibilityLabel).startsWith("Remove "),
      { deep: false },
    );
  const field = (tree: ReactTestRenderer) => tree.root.findAllByType(TextInput);
  const fieldStyle = (tree: ReactTestRenderer) =>
    StyleSheet.flatten(byId(tree, "add-host-field")[0].props.style);
  const clear = (tree: ReactTestRenderer) =>
    tree.root.findAll(
      (n) =>
        typeof n.props.onPress === "function" &&
        n.props.accessibilityLabel === "Clear",
      { deep: false },
    );
  const type = async (tree: ReactTestRenderer, text: string) => {
    await act(async () => field(tree)[0].props.onChangeText(text));
    await act(async () => pressable(tree, "Add").props.onPress());
  };
  const error = (tree: ReactTestRenderer) =>
    byId(tree, "add-host-error").map(flat)[0];

  test("the hosts wait behind a Hosts row with their count; open, each is a row, and Add a host ends the card", async () => {
    const tree = await render({
      hosts: ["qa-mac.local", "192.168.1.24:19151"],
    });
    await settle();
    expect(hostsBlock(tree).props.position).toBe("last");
    expect(textsOf(toggle(tree))).toEqual(["Hosts", "4"]);
    expect(toggle(tree).props.accessibilityLabel).toBe("Hosts, 4");
    expect(toggle(tree).props.accessibilityState).toEqual({ expanded: false });
    expect(hostNames(tree)).toEqual([]);
    expect(textsOf(hostsBlock(tree)).at(-1)).toBe("Add a host");

    await act(async () => toggle(tree).props.onPress());
    expect(toggle(tree).props.accessibilityState).toEqual({ expanded: true });
    expect(toggle(tree).findByType(Chevron).props.open).toBe(true);
    expect(hostNames(tree)).toEqual([
      "localhost",
      "127.0.0.1",
      "qa-mac.local",
      "192.168.1.24:19151",
    ]);
    // A drawn computer on each, no font glyph.
    for (const row of byId(tree, "host-row"))
      expect(row.findAllByType(HostIcon)).toHaveLength(1);
    // This computer's names and the app's hosts can't be removed.
    expect(removeButtons(tree)).toEqual([]);
    expect(textsOf(hostsBlock(tree)).at(-1)).toBe("Add a host");
    expect(field(tree)).toEqual([]);
    await act(async () => toggle(tree).props.onPress());
    expect(hostNames(tree)).toEqual([]);
    await act(async () => tree.unmount());
  });

  test("no Add a host when the app turns custom hosts off", async () => {
    const tree = await render({ allowCustomHosts: false });
    await settle();
    expect(textsOf(toggle(tree))).toEqual(["Hosts", "2"]);
    expect(texts(tree)).not.toContain("Add a host");
    await act(async () => tree.unmount());
  });

  test("with no server found, the card says so in its first row, above the hosts", async () => {
    const tree = await render(true);
    await settle();
    const [hint] = tree.root.findAllByType(HintRow);
    expect(hint.props.position).toBe("first");
    expect(hint.findByType(Card).props.position).toBe("first");
    expect(textsOf(hint)).toEqual([
      "No Metro server found. Start one with npx preview start.",
    ]);
    expect(hostsBlock(tree).props.position).toBe("last");
    await act(async () => tree.unmount());
  });

  test("Add a host opens a field for the keyboard, with a clear button, that says in plain words why a host can't be added", async () => {
    const tree = await render({ hosts: ["qa-mac.local"] });
    await settle();
    await act(async () => pressable(tree, "Add a host").props.onPress());
    expect(field(tree)).toHaveLength(1);
    expect(field(tree)[0].props).toMatchObject({
      placeholder: "192.168.1.24 or qa-mac.local",
      autoFocus: true,
      autoCapitalize: "none",
      autoCorrect: false,
      keyboardType: "url",
      returnKeyType: "done",
    });
    // The field shows the same drawn computer as the host rows.
    expect(
      byId(tree, "add-host-field")[0].findAllByType(HostIcon),
    ).toHaveLength(1);
    // iOS scrolls it up above the keyboard.
    expect(
      tree.root.findByType(FlatList).props.automaticallyAdjustKeyboardInsets,
    ).toBe(true);
    expect(texts(tree)).not.toContain("Add a host");
    expect(texts(tree)).toContain(
      "A computer running npx preview start. Add :port if its registry is not on 19150.",
    );
    expect(fieldStyle(tree).borderColor).toBe(LIGHT_THEME.border);
    await act(async () => field(tree)[0].props.onFocus());
    expect(fieldStyle(tree).borderColor).toBe(LIGHT_THEME.primary);

    // Nothing to clear yet.
    expect(clear(tree)).toEqual([]);
    await type(tree, "qa mac");
    expect(error(tree)).toBe("That is not an IP address or a host name.");
    expect(fieldStyle(tree).borderColor).toBe(LIGHT_THEME.danger);
    // The clear button empties the field and takes the error with it.
    expect(clear(tree)[0].findAllByType(Text)).toEqual([]);
    await act(async () => clear(tree)[0].props.onPress());
    expect(field(tree)[0].props.value).toBe("");
    expect(error(tree)).toBeUndefined();
    expect(clear(tree)).toEqual([]);

    await type(tree, "127.0.0.1");
    expect(error(tree)).toBe("127.0.0.1 is always checked.");
    await type(tree, "QA-Mac.local:19150");
    expect(error(tree)).toBe("qa-mac.local is already in the list.");
    // Typing again clears the error.
    await act(async () => field(tree)[0].props.onChangeText("qa"));
    expect(error(tree)).toBeUndefined();
    await act(async () => pressable(tree, "Cancel").props.onPress());
    expect(field(tree)).toEqual([]);
    expect(texts(tree)).toContain("Add a host");
    await act(async () => tree.unmount());
  });

  test("a host added there is saved and shown open in the list, with a drawn remove button that removes it", async () => {
    const tree = await render(true);
    await settle();
    await act(async () => pressable(tree, "Add a host").props.onPress());
    await act(async () => field(tree)[0].props.onChangeText("192.168.1.30"));
    await act(async () => field(tree)[0].props.onSubmitEditing());
    await settle();
    expect(field(tree)).toEqual([]);
    const saved = async () =>
      JSON.parse(await new File(rootDirectory(), "hosts.json").text());
    expect(await saved()).toEqual(["192.168.1.30"]);
    expect(toggle(tree).props.accessibilityState).toEqual({ expanded: true });
    expect(hostNames(tree)).toContain("192.168.1.30");
    const [remove] = removeButtons(tree);
    expect(remove.props.accessibilityLabel).toBe("Remove 192.168.1.30");
    expect(remove.findAllByType(Text)).toEqual([]);
    expect(
      StyleSheet.flatten(remove.props.style({ pressed: false })),
    ).toMatchObject({ width: 44, height: 44 });
    await act(async () => remove.props.onPress());
    await settle();
    expect(removeButtons(tree)).toEqual([]);
    expect(hostNames(tree)).not.toContain("192.168.1.30");
    expect(await saved()).toEqual([]);
    await act(async () => tree.unmount());
  });
});
