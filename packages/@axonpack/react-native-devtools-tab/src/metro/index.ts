import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import {
  DEVTOOLS_ID,
  DEVTOOLS_ROUTE,
  pageUrl,
} from "../core/constants/devtools.const";

/**
 * Puts a tab of your own in React Native DevTools, by serving the DevTools frontend from a route of
 * ours and injecting one script into its entry page. Nothing is forked and nothing is patched on
 * disk.
 *
 * ```js
 * // metro.config.js
 * const { getDefaultConfig } = require('expo/metro-config');
 * const {
 *   withReactNativeDevtoolsPanel,
 * } = require('@axonpack/react-native-devtools-tab/metro');
 *
 * module.exports = withReactNativeDevtoolsPanel(getDefaultConfig(__dirname));
 * ```
 */

// This file has no relative imports, and must not grow any. It is the one thing here that Node
// loads directly, and Node's ESM resolver demands an extension on every relative specifier, which
// Metro cannot follow back to a `.ts`. Keeping it self-contained is what lets every other file use
// plain extensionless imports that Metro reads straight from source.
//
// `tsc` emits this file as ESM and Node loads it as ESM, where there is no ambient `require`. Every
// lookup below is for a package belonging to the running dev server, so they have to be resolved at
// runtime rather than imported.
//
// A CommonJS loader (Jest, and some Metro setups) leaves `import.meta.url` null, where the working
// directory is a fine base: nothing resolved through it lives outside the project.
const require = createRequire(__filename);

function hostScript(): string {
  const ROUTE = DEVTOOLS_ROUTE;
  const id = DEVTOOLS_ID;
  return `
import * as UI from '${ROUTE}/ui/legacy/legacy.js';
import * as SDK from '${ROUTE}/core/sdk/sdk.js';

const DOMAIN = ${JSON.stringify(id)};
const DISPATCHER = '__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__';

// The frontend builds itself after DOMContentLoaded, and the tab strip is the last thing to appear.
// There is no event for "ready", so this waits for the element that means it.
const waitForFrontend = () =>
  new Promise((resolve) => {
    const check = () => document.querySelector('.main-tabbed-pane');
    if (check()) return resolve();
    const observer = new MutationObserver(() => {
      if (check()) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

const getRuntime = () => {
  const targets = SDK.TargetManager.TargetManager.instance();
  const target = targets.primaryPageTarget() ?? targets.rootTarget();
  return target?.model(SDK.RuntimeModel.RuntimeModel) ?? null;
};

/**
 * The app answers on a binding the dispatcher names itself, and the frontend has to ask for that
 * binding before anything arrives. Polls because the dispatcher is installed by the app's own
 * bundle, which may not have run yet when the panel opens.
 */
const connectToApp = async (onMessage) => {
  for (let attempt = 0; attempt < 40; attempt++) {
    const runtime = getRuntime();
    if (runtime) {
      const probe = await runtime.agent.invoke_evaluate({
        expression: 'globalThis.' + DISPATCHER + ' != undefined',
        returnByValue: true,
      });

      if (probe.result?.value === true) {
        const named = await runtime.agent.invoke_evaluate({
          expression: DISPATCHER + '.BINDING_NAME',
        });
        const binding = named.result?.value;
        if (binding) {
          runtime.addEventListener('BindingCalled', (event) => {
            if (event.data.name !== binding) return;
            // Every domain shares this one binding, React DevTools included, and its messages carry
            // whole component trees. Checking the raw string first skips parsing those.
            if (!event.data.payload.includes(DOMAIN)) return;
            const parsed = JSON.parse(event.data.payload);
            if (parsed.domain === DOMAIN) onMessage(parsed.message);
          });
          await runtime.agent.invoke_addBinding({ name: binding });
          await runtime.agent.invoke_evaluate({
            expression: 'void ' + DISPATCHER + '.initializeDomain(' + JSON.stringify(DOMAIN) + ')',
          });
          return (message) => {
            const serialized = JSON.stringify(JSON.stringify(message));
            void runtime.agent.invoke_evaluate({
              expression:
                DISPATCHER + '.sendMessage(' + JSON.stringify(DOMAIN) + ', ' + serialized + ')',
            });
          };
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
};

class TabPanel extends UI.View.SimpleView {
  constructor(tab) {
    // The symbol is part of the title, and written as an escape so no tool can mangle it. The
    // frontend's own icon slots take an element, and every way of putting one there loses its
    // drawing: the suffix slot re-renders with a shallow cloneNode(), and the leading slot only
    // accepts a name from DevTools' own image set. Text has none of that.
    super(tab.name + ' ' + (tab.icon || '🛝'), true, tab.id);
    // Keeps the iframe alive when another tab is selected, so a tab does not lose everything it has
    // been sent every time somebody looks at Console.
    this.setHideOnDetach();

    const iframe = document.createElement('iframe');
    // A tab may bring its own page, or name a component for the dev server to build into one. Ours
    // is the default, not the only option.
    iframe.src =
      tab.url ||
      (tab.page
        ? '${ROUTE}/pages/' + encodeURIComponent(tab.page) + '/'
        : '${ROUTE}/panel/index.html?tab=' + encodeURIComponent(tab.id));
    iframe.style.cssText = 'width:100%;height:100%;border:0';
    this.contentElement.appendChild(iframe);
    this.iframe = iframe;
  }
}

const main = async () => {
  await waitForFrontend();

  const inspector = UI.InspectorView.InspectorView.instance();
  const panels = new Map();

  const send = await connectToApp((message) => {
    for (const panel of panels.values()) {
      panel.iframe.contentWindow?.postMessage(message, '*');
    }
    const body = message?.data;
    if (message?.type !== 'tab:register' || !body?.id) return;
    if (panels.has(body.id)) return;

    const panel = new TabPanel(body);
    panels.set(body.id, panel);
    inspector.addPanel(panel);

    // The panel was not listening when this arrived, so replay it once the iframe is up.
    panel.iframe.addEventListener('load', () => {
      panel.iframe.contentWindow?.postMessage(message, '*');
    });
  });

  if (!send) {
    console.warn('[devtools] the app never installed its devtools dispatcher');
    return;
  }

  window.addEventListener('message', (event) => {
    for (const panel of panels.values()) {
      if (event.source === panel.iframe.contentWindow) {
        send(event.data);
        return;
      }
    }
  });
};

main().catch((error) => console.error('[devtools] panel failed to start', error));
`;
}

/**
 * The consumer gives a component, so the entry that mounts it is generated rather than written by
 * hand. It lives beside the build output instead of in their source tree, which is also what keeps
 * `react-dom` resolving from their project rather than from this package.
 */
function pageEntry(source: string): string {
  return `import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import Component from ${JSON.stringify(source)};

const root = document.getElementById('root');
if (root) createRoot(root).render(createElement(Component));
`;
}

function pageTemplate(name: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${name}</title>
<style>
  :root { color-scheme: dark light; }
  html, body, #root { height: 100%; }
  body { margin: 0; background: #1e1e1e; color: #dddddd;
         font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; }
  @media (prefers-color-scheme: light) { body { background: #ffffff; color: #202020; } }
</style>
</head>
<body><div id="root"></div></body>
</html>
`;
}

type Rsbuild = {
  onAfterBuild: (fn: () => void) => void;
  build: (options?: { watch?: boolean }) => Promise<unknown>;
};

type Page = {
  /** Where the build writes, and so what requests are answered from. */
  dist: string;
  /** Settles when there is something to serve, and rejects with whatever stopped the build. */
  ready: Promise<void>;
};

/**
 * Builds one page, and keeps building it.
 *
 * Watched rather than built once, so editing the component and reloading the tab is the whole loop.
 * rsbuild is resolved from the consumer's project rather than from here: it is theirs to install,
 * being needed only by projects that declare a page.
 */
function startPage(
  source: string,
  file: string,
  projectRoot: string,
  roots: string[],
): Page {
  // Keyed by the path itself rather than by a flattened name, so two components cannot land on one
  // build directory.
  const base = path.join(
    projectRoot,
    "node_modules/.cache/axonpack-devtools-tab",
    source,
  );
  // A sibling of the generated files, not their folder: rsbuild empties its own dist before a build.
  const dist = path.join(base, "dist");
  const entry = path.join(base, "entry.js");
  const template = path.join(base, "index.html");
  const prefix = pageUrl(source);

  const ready = (async (): Promise<void> => {
    fs.mkdirSync(base, { recursive: true });
    fs.writeFileSync(entry, pageEntry(file));
    fs.writeFileSync(template, pageTemplate(source));

    const { createRsbuild } = require<{
      createRsbuild: (options: {
        cwd: string;
        rsbuildConfig: Record<string, unknown>;
      }) => Promise<Rsbuild>;
    }>(require.resolve("@rsbuild/core", { paths: roots }));

    const rsbuild = await createRsbuild({
      cwd: base,
      rsbuildConfig: {
        // An `environments` block, not a bare `source`/`output` pair: without one rsbuild builds
        // nothing at all, silently, with no error and no assets.
        environments: {
          web: {
            source: { entry: { index: entry } },
            output: {
              target: "web",
              distPath: { root: dist },
              assetPrefix: prefix,
            },
            html: { template },
            performance: { chunkSplit: { strategy: "all-in-one" } },
            // Spelled out because rsbuild's default is the classic runtime, which needs `React` in
            // scope, and a component written today imports hooks rather than the namespace.
            tools: {
              swc: { jsc: { transform: { react: { runtime: "automatic" } } } },
            },
          },
        },
        // A watch build is a development build, where `output.assetPrefix` is ignored in favour of
        // this one. Both are set to where the page is actually served, because the default is the
        // server root and the assets would be looked for outside the page.
        dev: { assetPrefix: prefix },
        logLevel: "error",
      },
    });

    // Registered before the build starts, because a watch build resolves without waiting for the
    // first compile and the tab asks for the page the moment it opens.
    const first = new Promise<void>((resolve) => {
      rsbuild.onAfterBuild(() => resolve());
    });
    await rsbuild.build({ watch: true });
    await first;
  })();

  // Nothing awaits this until a request arrives, and an unhandled rejection would take Metro down.
  void ready.catch(() => {});

  return { dist, ready };
}

type Incoming = {
  url?: string;
  method?: string;
  on: (event: string, fn: (chunk?: unknown) => void) => void;
};
type Outgoing = {
  end: (body?: string | Uint8Array) => void;
  setHeader: (name: string, value: string) => void;
  statusCode?: number;
};
type Middleware = (
  request: Incoming,
  response: Outgoing,
  next: (err?: Error) => void,
) => void;

const TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

function projectRoots(projectRoot: string): string[] {
  const roots = [projectRoot];

  for (const from of [
    "expo",
    "react-native",
    "@expo/cli",
    "@react-native/community-cli-plugin",
  ]) {
    try {
      roots.push(
        path.dirname(require.resolve(`${from}/package.json`, { paths: roots })),
      );
    } catch {
      // Not every project has every one of these. The next candidate may still resolve.
    }
  }

  return roots;
}

/** Its entry exports the directory its files live in, several levels below the package root. */
function findFrontend(roots: string[]): string | null {
  try {
    const exported = require<unknown>(
      require.resolve("@react-native/debugger-frontend", { paths: roots }),
    );
    return typeof exported === "string" ? exported : null;
  } catch {
    return null;
  }
}

function pointDebuggerAt(roots: string[]): void {
  try {
    const middleware = path.dirname(
      require.resolve("@react-native/dev-middleware/package.json", {
        paths: roots,
      }),
    );
    const loaded = require<{ default?: unknown }>(
      path.join(middleware, "dist/utils/getDevToolsFrontendUrl"),
    );
    const original = loaded.default as
      ((...args: unknown[]) => string) | undefined;
    if (typeof original !== "function") return;
    if ((original as { patchedBy?: string }).patchedBy) return;

    const patched = (...args: unknown[]): string =>
      String(original(...args)).replace(
        "/debugger-frontend/",
        `${DEVTOOLS_ROUTE}/`,
      );
    (patched as { patchedBy?: string }).patchedBy = DEVTOOLS_ID;
    loaded.default = patched;
  } catch {
    console.warn(
      "[devtools] could not point the debugger shortcut at the tab.",
    );
  }
}

/** The page ships a strict CSP, so an injected script needs a nonce allowed by it. */
function injectHost(html: string, base: string): string {
  const nonce = crypto.randomUUID();
  const withNonce = html.replace(
    /(<meta[^>]*http-equiv="Content-Security-Policy"[^>]*content=")([^"]*)"/,
    (_match, head: string, policy: string) =>
      `${head}${policy.replace(/script-src ([^;]+)/, `script-src $1 'nonce-${nonce}'`)}"`,
  );

  return withNonce.replace(
    /<body[^>]*>/,
    (body) =>
      `<script type="module" nonce="${nonce}" src="${base}/host.js"></script>${body}`,
  );
}

function serve(
  response: Outgoing,
  body: string | Uint8Array,
  type: string,
): void {
  response.setHeader("Content-Type", type);
  response.end(body);
}

/** Answers with a file from `root`. Checked, so a crafted path cannot read outside it. */
function sendFile(
  root: string,
  relative: string,
  response: Outgoing,
  transform?: (html: string) => string,
): void {
  const file = path.join(root, path.normalize(relative));

  if (!file.startsWith(root)) {
    response.statusCode = 403;
    response.end("no");
    return;
  }

  fs.readFile(file, (error, contents) => {
    if (error) {
      response.statusCode = 404;
      response.end("not found");
      return;
    }

    serve(
      response,
      transform ? transform(contents.toString("utf8")) : contents,
      TYPES[path.extname(file)] ?? "application/octet-stream",
    );
  });
}

export type ReactNativeDevtoolsPanelOptions = {
  /**
   * Where React Native DevTools' own files are, for a layout this cannot work out for itself. A
   * monorepo that hoists oddly is the case that needs it.
   */
  frontendPath?: string;
};

export function withReactNativeDevtoolsPanel<
  TConfig extends {
    projectRoot?: string;
    server?: { enhanceMiddleware?: unknown };
  },
>(config: TConfig, options: ReactNativeDevtoolsPanelOptions = {}): TConfig {
  const base = DEVTOOLS_ROUTE;
  const projectRoot = config.projectRoot ?? process.cwd();
  const roots = projectRoots(projectRoot);
  const frontend = options.frontendPath ?? findFrontend(roots);

  if (!frontend) {
    console.warn(
      "[devtools] React Native DevTools was not found, so no tab is served.",
    );
    return config;
  }

  // The built page shown in the tab, published with this package so it is found the same way from a
  // checkout or from `node_modules`.
  const panel = path.join(
    path.dirname(
      require.resolve("@axonpack/react-native-devtools-tab/package.json"),
    ),
    "dist/panel",
  );

  pointDebuggerAt(roots);

  // A tab names its own component, so nothing here knows the set up front: the first request for one
  // is what starts building it. That also means a tab nobody opens costs nothing.
  const building = new Map<string, Page>();
  const pageFor = (source: string): Page | null => {
    const file = path.resolve(projectRoot, source);
    // The path arrives over the debugger channel, so it is checked rather than trusted. Metro
    // already bundles any entry in the project on request; outside it is another matter.
    if (!file.startsWith(projectRoot)) return null;

    let page = building.get(file);
    if (!page) {
      page = startPage(source, file, projectRoot, roots);
      building.set(file, page);
    }
    return page;
  };

  /** Answers one of our routes, or reports that the request was not ours. */
  const handle = (request: Incoming, response: Outgoing): boolean => {
    const url = (request.url ?? "").split("?")[0];
    if (!url.startsWith(base)) return false;

    const rest = url.slice(base.length) || "/";

    if (rest === "/host.js") {
      serve(response, hostScript(), "application/javascript");
      return true;
    }

    if (rest.startsWith("/pages/")) {
      const [encoded, ...within] = rest.slice("/pages/".length).split("/");
      const page = encoded ? pageFor(decodeURIComponent(encoded)) : null;

      if (!page) {
        response.statusCode = 404;
        response.end("no such page");
        return true;
      }

      page.ready.then(
        () => sendFile(page.dist, within.join("/") || "index.html", response),
        (error: unknown) => {
          // Shown as the page itself, because a build that failed otherwise reads as a blank tab.
          response.statusCode = 500;
          const message = String(
            (error as { message?: string })?.message ?? error,
          );
          serve(
            response,
            `<pre>${message.replace(/</g, "&lt;")}</pre>`,
            "text/html",
          );
        },
      );
      return true;
    }

    // `/panel/...` is the page this package ships, everything else is the real DevTools frontend.
    const inPanel = rest.startsWith("/panel/");
    sendFile(
      inPanel ? panel : frontend,
      inPanel ? rest.slice("/panel".length) : rest,
      response,
      rest === "/rn_fusebox.html"
        ? (html) => injectHost(html, base)
        : undefined,
    );
    return true;
  };

  const previous = config.server?.enhanceMiddleware as
    ((middleware: Middleware, server: unknown) => Middleware) | undefined;

  return {
    ...config,
    server: {
      ...config.server,
      enhanceMiddleware: (
        middleware: Middleware,
        server: unknown,
      ): Middleware => {
        const next = previous ? previous(middleware, server) : middleware;

        return (request, response, done) => {
          if (!handle(request, response)) next(request, response, done);
        };
      },
    },
  };
}
