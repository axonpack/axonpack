import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "bun:test";

import { withReactNativeDevtoolsTab } from "../index";

/**
 * The page a tab shows is generated rather than shipped, because the only thing in it that varies is
 * the URL Metro serves the app's own tab module from. Getting that URL wrong is a blank tab with a
 * 404 in a console nobody opens, so it is worked out here where it can be checked.
 */
function serve(
  projectRoot: string,
  url: string,
  options: { tabs?: string; serverRoot?: string } = {},
): Promise<string> {
  type Handler = (req: unknown, res: unknown, next: () => void) => void;

  const config = withReactNativeDevtoolsTab(
    {
      projectRoot,
      server: options.serverRoot
        ? { unstable_serverRoot: options.serverRoot }
        : {},
    },
    { frontendPath: "/tmp/none", tabs: options.tabs },
  ) as { server: { enhanceMiddleware: (m: unknown, s: unknown) => Handler } };

  // A file is answered from a callback, so this waits for the response rather than reading a
  // variable that a synchronous route happens to have filled already.
  return new Promise<string>((resolve) => {
    config.server.enhanceMiddleware(() => undefined, null)(
      { url, method: "GET", on: () => undefined },
      {
        setHeader: () => undefined,
        end: (body: string | Uint8Array) => resolve(String(body)),
      },
      () => undefined,
    );
  });
}

/** A project with a tab module in it, since the plugin looks for a real file. */
function project(entry = "devtools.ts"): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "devtools-tab-"));
  fs.mkdirSync(path.dirname(path.join(root, entry)), { recursive: true });
  fs.writeFileSync(path.join(root, entry), "// tabs go here\n");
  return root;
}

test("the page loads the app's own tab module, built for the web", async () => {
  const page = await serve(
    project(),
    "/devtools-tab/panel/index.html?tab=session",
  );

  // `platform=web` is the whole thing: it is what makes Metro resolve `react-native` to
  // react-native-web, so the tab is a React Native app in a browser rather than a translation.
  expect(page).toContain('src="/devtools.bundle?platform=web&dev=true"');
  expect(page).toContain('<div id="root"></div>');
});

test("a monorepo's bundle url is relative to the root Metro serves, not the app", async () => {
  const root = project("apps/mobile/devtools.ts");

  const page = await serve(
    path.join(root, "apps/mobile"),
    "/devtools-tab/panel/index.html?tab=session",
    { serverRoot: root },
  );

  // Metro resolves a bundle path against the root it serves. Taking it from the project root
  // instead asked for `/devtools.bundle`, which is above the app and does not exist.
  expect(page).toContain('src="/apps/mobile/devtools.bundle?platform=web');
});

test("the tab module can be named, and is found without its extension", async () => {
  const root = project("src/panels/tabs.tsx");

  expect(
    await serve(path.join(root), "/devtools-tab/panel/index.html", {
      tabs: "./src/panels/tabs",
    }),
  ).toContain('src="/src/panels/tabs.bundle?platform=web');
});

test("a project with no tab module says so rather than serving a blank page", async () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "devtools-tab-none-"));
  const page = await serve(empty, "/devtools-tab/panel/index.html");

  expect(page).toContain("No tab module was found");
});

test("the one stylesheet a page loads is this package's own", async () => {
  const css = await serve(project(), "/devtools-tab/panel/renderer.css");

  expect(css).toContain(".axonpack-tab-bar");
});
