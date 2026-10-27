import { createElement as h } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

import { PreviewProvider } from "../provider";
import { PreviewList } from "./preview-list";

jest.mock("expo-file-system", () => require("../fake-file-system.test-helper"));
let mockSlug: string | undefined = "shop";
let mockNativeState: { bundle?: string; localServer?: string } = {};
jest.mock("expo", () => ({
  requireOptionalNativeModule: () => ({
    key: "version-1.0.0",
    get slug() {
      return mockSlug;
    },
    state: () => mockNativeState,
    markLaunched: () => undefined,
  }),
}));

beforeEach(() => {
  mockNativeState = {};
  mockSlug = "shop";
  global.fetch = jest.fn(
    async () => new Response("", { status: 404 }),
  ) as typeof fetch;
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
  const tree = await render(true);
  expect(texts(tree)).toContain("Running: task-1");
  expect(texts(tree)).toContain(METRO_NOTE);
  await act(async () => tree.unmount());
});

test("a dev preview server in use names the server and drops the Metro note", async () => {
  mockNativeState = {
    bundle: "task-1/ios/main.jsbundle",
    localServer: "http://localhost:8082/index.bundle?platform=ios",
  };
  const tree = await render(true);
  expect(texts(tree)).toContain("Running: localhost:8082 (local)");
  expect(texts(tree)).not.toContain(METRO_NOTE);
  await act(async () => tree.unmount());
});

test("the base bundle shows no note", async () => {
  const tree = await render(true);
  expect(texts(tree)).toContain("Running: Embedded bundle");
  expect(texts(tree)).not.toContain(METRO_NOTE);
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
