import { createElement as h } from "react";
import { baseInfo, fake } from "../native-fake.test-helper";
import { resetNativeUpdateState } from "../native-update";
import {
  DARK_THEME,
  DefaultUpdateModal,
  LIGHT_THEME,
} from "./default-update-modal";
import { clearCache } from "../cache";
import { setVersionInfo } from "../source";
import { UpdatePrompt } from "./update-prompt";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";

// The package loads react-native lazily, so a fake native layer stands in for it. Host elements
// keep their own names ("View", "Pressable", ...), which is what the tests look for.
const opened: string[] = [];
let scheme: "light" | "dark" = "light";

const mockFakeRn = {
  Platform: { OS: "ios" },
  useColorScheme: () => scheme,
  Linking: {
    openURL: async (url: string) => {
      opened.push(url);
    },
  },
  AppState: { addEventListener: () => ({ remove: () => {} }) },
  Modal: ({ visible, children }: { visible: boolean; children?: unknown }) =>
    visible ? h("Modal", null, children as never) : null,
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  Image: "Image",
  ActivityIndicator: "ActivityIndicator",
  Pressable: ({ children, ...rest }: { children?: unknown; style?: unknown }) =>
    h("Pressable", { ...rest, style: undefined }, children as never),
};

jest.mock("../runtime", () => ({
  reactNative: () => mockFakeRn,
  currentPlatform: () => "ios",
  isStorePlatform: (v: string) => v === "ios" || v === "android",
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const host = (n: ReactTestInstance, name: string) =>
  (n.type as unknown) === name;

const texts = (node: ReactTestInstance): string =>
  node
    .findAll((n) => host(n, "Text"))
    .map((n) => n.children.filter((c) => typeof c === "string").join(""))
    .join(" | ");

const button = (root: ReactTestInstance, label: string) =>
  root.findAll((n) => host(n, "Pressable") && texts(n).includes(label))[0];

const styleOf = (node: ReactTestInstance) =>
  node.props.style as Record<string, unknown>;

const modalProps = {
  visible: true,
  isForced: false,
  isUpdating: false,
  canSkip: true,
  currentVersion: "1.0.0",
  latestVersion: "2.0.0",
  updateType: "major" as const,
  storeUrl: "https://store.test",
  onUpdate: () => {},
  onDismiss: () => {},
  onSkip: () => {},
};

const render = (element: Parameters<typeof TestRenderer.create>[0]) => {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(element);
  });
  return tree;
};

beforeEach(() => {
  resetNativeUpdateState();
  opened.length = 0;
  scheme = "light";
});

test("default modal shows title, versions, notes and the three actions", () => {
  const tree = render(
    h(DefaultUpdateModal, { ...modalProps, releaseNotes: "Fixed things" }),
  );
  const out = texts(tree.root);
  for (const part of [
    "Update available",
    "1.0.0",
    "2.0.0",
    "What's new",
    "Update",
    "Later",
    "Skip this version",
  ]) {
    expect(out).toContain(part);
  }
  expect(out).not.toContain("Fixed things");
  expect(tree.root.findAll((n) => host(n, "Image"))).toHaveLength(1);
});

test("a forced modal says so and offers only Update", () => {
  const tree = render(
    h(DefaultUpdateModal, {
      ...modalProps,
      isForced: true,
      canSkip: false,
      minimumVersion: "1.5.0",
    }),
  );
  expect(texts(tree.root)).toContain("Update required");
  expect(texts(tree.root)).toContain("1.5.0");
  expect(button(tree.root, "Later")).toBeUndefined();
  expect(button(tree.root, "Skip this version")).toBeUndefined();
  expect(button(tree.root, "Update")).toBeDefined();
});

test("canSkip false hides only the skip button", () => {
  const tree = render(h(DefaultUpdateModal, { ...modalProps, canSkip: false }));
  expect(button(tree.root, "Later")).toBeDefined();
  expect(button(tree.root, "Skip this version")).toBeUndefined();
});

test("theme, labels and fonts are applied", () => {
  const tree = render(
    h(DefaultUpdateModal, {
      ...modalProps,
      theme: { card: "#123456", fonts: { bold: "Brand-Bold" } },
      labels: { update: "Mettre à jour" },
    }),
  );
  expect(texts(tree.root)).toContain("Mettre à jour");
  const card = tree.root.findAll(
    (n) => host(n, "View") && styleOf(n)?.backgroundColor === "#123456",
  );
  expect(card).toHaveLength(1);
  const titles = tree.root.findAll(
    (n) => host(n, "Text") && styleOf(n)?.fontFamily === "Brand-Bold",
  );
  expect(titles.length).toBeGreaterThan(0);
});

test("dark appearance picks the dark palette, and mode overrides it", () => {
  scheme = "dark";
  const auto = render(h(DefaultUpdateModal, modalProps));
  expect(
    auto.root.findAll(
      (n) => host(n, "View") && styleOf(n)?.backgroundColor === DARK_THEME.card,
    ),
  ).toHaveLength(1);
  const forcedLight = render(
    h(DefaultUpdateModal, { ...modalProps, theme: { mode: "light" } }),
  );
  expect(
    forcedLight.root.findAll(
      (n) =>
        host(n, "View") && styleOf(n)?.backgroundColor === LIGHT_THEME.card,
    ),
  ).toHaveLength(1);
});

test("while updating, the button shows a spinner and does not fire", () => {
  let pressed = 0;
  const tree = render(
    h(DefaultUpdateModal, {
      ...modalProps,
      isUpdating: true,
      onUpdate: () => pressed++,
    }),
  );
  expect(tree.root.findAll((n) => host(n, "ActivityIndicator"))).toHaveLength(
    1,
  );
  const update = tree.root.findAll(
    (n) => host(n, "Pressable") && n.props.accessibilityState?.busy,
  )[0]!;
  expect(update.props.disabled).toBe(true);
});

const promptOptions = {
  currentVersion: "1.0.0",
  latestVersion: "2.0.0",
  storeUrl: "https://store.test",
};

const settle = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });
};

test("UpdatePrompt shows the modal, and Update opens the store", async () => {
  const tree = render(h(UpdatePrompt, promptOptions));
  await settle();
  expect(texts(tree.root)).toContain("Update available");
  await act(async () => {
    button(tree.root, "Update")!.props.onPress();
    await new Promise((r) => setTimeout(r, 10));
  });
  expect(opened).toEqual(["https://store.test"]);
});

test("Later hides it for the session", async () => {
  const tree = render(h(UpdatePrompt, promptOptions));
  await settle();
  await act(async () => button(tree.root, "Later")!.props.onPress());
  expect(tree.root.findAll((n) => host(n, "Modal"))).toHaveLength(0);
});

test("Skip hides it, remembers the version, and the next check stays quiet", async () => {
  const saved: Record<string, string> = {};
  const skipStorage = {
    getItem: (k: string) => saved[k] ?? null,
    setItem: (k: string, v: string) => {
      saved[k] = v;
    },
  };
  const first = render(h(UpdatePrompt, { ...promptOptions, skipStorage }));
  await settle();
  await act(async () =>
    button(first.root, "Skip this version")!.props.onPress(),
  );
  await settle();
  expect(Object.values(saved)).toEqual(["2.0.0"]);
  expect(first.root.findAll((n) => host(n, "Modal"))).toHaveLength(0);

  const second = render(h(UpdatePrompt, { ...promptOptions, skipStorage }));
  await settle();
  expect(second.root.findAll((n) => host(n, "Modal"))).toHaveLength(0);

  const newer = render(
    h(UpdatePrompt, { ...promptOptions, latestVersion: "2.0.1", skipStorage }),
  );
  await settle();
  expect(newer.root.findAll((n) => host(n, "Modal"))).toHaveLength(1);
});

test("required forces every update, and a forced prompt cannot be dismissed or skipped", async () => {
  const tree = render(h(UpdatePrompt, { ...promptOptions, required: true }));
  await settle();
  expect(texts(tree.root)).toContain("Update required");
  expect(button(tree.root, "Later")).toBeUndefined();
  expect(button(tree.root, "Skip this version")).toBeUndefined();
});

test("required can be limited by size, and canSkip false removes skip", async () => {
  const patch = render(
    h(UpdatePrompt, {
      ...promptOptions,
      latestVersion: "1.0.1",
      required: "major",
    }),
  );
  await settle();
  expect(texts(patch.root)).toContain("Update available");

  const major = render(
    h(UpdatePrompt, { ...promptOptions, required: "major" }),
  );
  await settle();
  expect(texts(major.root)).toContain("Update required");

  const noSkip = render(h(UpdatePrompt, { ...promptOptions, canSkip: false }));
  await settle();
  expect(button(noSkip.root, "Skip this version")).toBeUndefined();
  expect(button(noSkip.root, "Later")).toBeDefined();
});

test("a custom component receives everything it needs", async () => {
  let seen: Record<string, unknown> = {};
  const Custom = (props: Record<string, unknown>) => {
    seen = props;
    return h("Custom", null);
  };
  render(
    h(UpdatePrompt, {
      ...promptOptions,
      minimumVersion: "1.5.0",
      component: Custom as never,
    }),
  );
  await settle();
  expect(seen).toMatchObject({
    visible: true,
    isForced: true,
    isUpdating: false,
    canSkip: false,
    currentVersion: "1.0.0",
    latestVersion: "2.0.0",
    updateType: "major",
    storeUrl: "https://store.test",
  });
  for (const fn of ["onUpdate", "onSkip", "onDismiss"])
    expect(typeof seen[fn]).toBe("function");
});

test("a soft modal has no message line by default, and a label adds one", () => {
  const bare = render(h(DefaultUpdateModal, modalProps));
  expect(texts(bare.root).split(" | ")).toEqual([
    "Update available",
    "Installed",
    "1.0.0",
    "→",
    "Latest",
    "2.0.0",
    "Update",
    "Later",
    "Skip this version",
  ]);
  const withLine = render(
    h(DefaultUpdateModal, {
      ...modalProps,
      labels: { message: () => "Fixes and new features." },
    }),
  );
  expect(texts(withLine.root)).toContain("Fixes and new features.");
});

test("Later uses the primary colour and Skip the muted one", () => {
  const tree = render(
    h(DefaultUpdateModal, {
      ...modalProps,
      theme: { primary: "#112233", muted: "#aabbcc" },
    }),
  );
  const colourOf = (label: string) =>
    tree.root.findAll((n) => host(n, "Text") && texts(n) === label)[0]!.props
      .style.color;
  expect(colourOf("Later")).toBe("#112233");
  expect(colourOf("Skip this version")).toBe("#aabbcc");
});

test("What's new is a toggle: closed at first, then open, then closed again", () => {
  const tree = render(
    h(DefaultUpdateModal, { ...modalProps, releaseNotes: "Fixed things" }),
  );
  const toggle = () => button(tree.root, "What's new")!;
  expect(toggle().props.accessibilityState).toEqual({ expanded: false });
  expect(texts(tree.root)).not.toContain("Fixed things");
  const label = tree.root.findAll(
    (n) => host(n, "Text") && texts(n) === "What's new",
  )[0]!;
  expect(styleOf(label).textDecorationLine).toBe("underline");

  act(() => toggle().props.onPress());
  expect(toggle().props.accessibilityState).toEqual({ expanded: true });
  expect(texts(tree.root)).toContain("Fixed things");

  act(() => toggle().props.onPress());
  expect(texts(tree.root)).not.toContain("Fixed things");
});

test("without release notes there is no What's new row", () => {
  const tree = render(h(DefaultUpdateModal, modalProps));
  expect(button(tree.root, "What's new")).toBeUndefined();
});

test("notesExpanded opens the notes from the start", () => {
  const tree = render(
    h(DefaultUpdateModal, {
      ...modalProps,
      releaseNotes: "Fixed things",
      notesExpanded: true,
    }),
  );
  expect(texts(tree.root)).toContain("Fixed things");
});

const pressUpdate = async (tree: TestRenderer.ReactTestRenderer) => {
  await act(async () => {
    button(tree.root, "Update")!.props.onPress();
    await new Promise((r) => setTimeout(r, 20));
  });
};

const starts = () => fake.calls.filter((c) => c.startsWith("start"));

test("nativeUpdate: a forced update runs the immediate flow, a soft one the flexible flow", async () => {
  fake.reset();
  const forced = render(
    h(UpdatePrompt, {
      ...promptOptions,
      minimumVersion: "1.5.0",
      nativeUpdate: true,
    }),
  );
  await settle();
  await pressUpdate(forced);
  expect(starts()).toEqual(["start:immediate"]);

  fake.reset();
  const soft = render(
    h(UpdatePrompt, { ...promptOptions, nativeUpdate: true }),
  );
  await settle();
  await pressUpdate(soft);
  expect(starts()).toEqual(["start:flexible"]);
});

test("nativeUpdate: when Play has nothing to start, the store link opens", async () => {
  fake.reset();
  fake.infoError = true;
  const tree = render(
    h(UpdatePrompt, { ...promptOptions, nativeUpdate: true }),
  );
  await settle();
  await pressUpdate(tree);
  expect(opened).toEqual(["https://store.test"]);
});

test("nativeUpdate: a Play failure also opens the store link", async () => {
  fake.reset();
  fake.startCode = 1;
  const tree = render(
    h(UpdatePrompt, { ...promptOptions, nativeUpdate: true }),
  );
  await settle();
  await pressUpdate(tree);
  expect(opened).toEqual(["https://store.test"]);
});

test("nativeUpdate: a declined consent dialog does not open the store", async () => {
  fake.reset();
  fake.startCode = 0;
  const tree = render(
    h(UpdatePrompt, { ...promptOptions, nativeUpdate: true }),
  );
  await settle();
  await pressUpdate(tree);
  expect(opened).toEqual([]);
});

test("nativeUpdate: an accepted flexible update hides the modal while it downloads", async () => {
  fake.reset();
  const tree = render(
    h(UpdatePrompt, { ...promptOptions, nativeUpdate: true }),
  );
  await settle();
  await pressUpdate(tree);
  expect(tree.root.findAll((n) => host(n, "Modal"))).toHaveLength(0);
});

test("nativeUpdate: a finished download installs without a second prompt", async () => {
  fake.reset();
  const tree = render(
    h(UpdatePrompt, { ...promptOptions, nativeUpdate: true }),
  );
  await settle();
  await pressUpdate(tree);
  await act(async () => fake.emit(11));
  expect(fake.calls).toContain("complete");
});

test("nativeUpdate: an immediate update the user left is resumed when the app opens", async () => {
  fake.reset();
  fake.info = { ...baseInfo, available: false, inProgress: true };
  render(h(UpdatePrompt, { ...promptOptions, nativeUpdate: true }));
  await settle();
  expect(starts()).toEqual(["start:immediate"]);
});

test("nativeUpdate: an update that finished downloading while the app was closed is installed on Update", async () => {
  fake.reset();
  fake.info = { ...baseInfo, installStatus: 11 };
  const tree = render(
    h(UpdatePrompt, { ...promptOptions, nativeUpdate: true }),
  );
  await settle();
  await pressUpdate(tree);
  expect(fake.calls).toContain("complete");
  expect(starts()).toEqual([]);
});

test("nativeUpdate off: Play is never asked", async () => {
  fake.reset();
  render(h(UpdatePrompt, promptOptions));
  await settle();
  expect(fake.calls).toEqual([]);
});

test("a new build of the same version shows both build numbers", () => {
  const tree = render(
    h(DefaultUpdateModal, {
      ...modalProps,
      currentVersion: "1.0.0",
      latestVersion: "1.0.0",
      updateType: "build",
      currentBuildNumber: 10,
      latestBuildNumber: 20,
    }),
  );
  expect(texts(tree.root)).toContain("1.0.0 (10)");
  expect(texts(tree.root)).toContain("1.0.0 (20)");
});

test("other updates show the version alone", () => {
  const tree = render(h(DefaultUpdateModal, modalProps));
  expect(texts(tree.root)).not.toContain("(");
});

test("the whole chain: Play page, Play version code and the prompt agree on a new Android build", async () => {
  fake.reset();
  clearCache();
  fake.info = { ...baseInfo, available: true, availableVersionCode: 20 };
  setVersionInfo({
    getCountry: () => "US",
    getPackageName: () => "com.example.app",
    getCurrentBuildNumber: () => 10,
    getCurrentVersion: () => "1.0.0",
  });
  const tree = render(
    h(UpdatePrompt, {
      provider: "playStore",
      platform: "android",
      packageName: "com.example.app",
      retries: 0,
      fetch: (async () =>
        new Response(
          "<div>Current Version</div><span>1.0.0</span>",
        )) as unknown as typeof fetch,
    }),
  );
  await settle();
  expect(texts(tree.root)).toContain("Update available");
  expect(texts(tree.root)).toContain("1.0.0 (10)");
  expect(texts(tree.root)).toContain("1.0.0 (20)");
});
