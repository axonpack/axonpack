import { createElement as h } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

import { PreviewProvider } from "../provider";
import { PreviewList } from "./preview-list";

jest.mock("expo-file-system", () => require("../fake-file-system.test-helper"));
jest.mock("expo", () => ({
  requireOptionalNativeModule: () => ({
    key: "version-1.0.0",
    slug: "shop",
    state: () => ({}),
    markLaunched: () => undefined,
  }),
}));

beforeEach(() => {
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

async function render(localServers?: { enabled: boolean }) {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      h(PreviewProvider, {
        config: { enabled: true, url: "http://localhost:9000/b", localServers },
        children: h(PreviewList),
      }),
    );
  });
  return tree;
}

test("the local servers section is not there unless the app turns it on", async () => {
  const tree = await render();
  expect(texts(tree)).toContain("Previews");
  expect(texts(tree)).not.toContain("Local servers");
  await act(async () => tree.unmount());
});

test("with it on, a debug build shows the section", async () => {
  const tree = await render({ enabled: true });
  expect(texts(tree)).toContain("Local servers");
  expect(texts(tree)).toContain(
    "No Metro server found. Start one with npx preview start.",
  );
  await act(async () => tree.unmount());
});

test("a release build never shows it", async () => {
  const dev = (global as { __DEV__?: boolean }).__DEV__;
  (global as { __DEV__?: boolean }).__DEV__ = false;
  try {
    const tree = await render({ enabled: true });
    expect(texts(tree)).not.toContain("Local servers");
    await act(async () => tree.unmount());
  } finally {
    (global as { __DEV__?: boolean }).__DEV__ = dev;
  }
});
