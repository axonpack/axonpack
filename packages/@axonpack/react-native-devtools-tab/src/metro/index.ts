import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import {
  DEVTOOLS_ID,
  DEVTOOLS_ROUTE,
  DEVTOOLS_TABS,
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
  const tabs = DEVTOOLS_TABS;
  return `
import * as UI from '${ROUTE}/ui/legacy/legacy.js';
import * as SDK from '${ROUTE}/core/sdk/sdk.js';

const DOMAIN = ${JSON.stringify(id)};
const TABS = ${JSON.stringify(tabs)};
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
          // Read rather than waited for. The app announces a tab when it registers one, but a
          // frontend that reloads has missed every announcement and nothing re-sends them, so the
          // tab strip came back empty. Asking is also what puts the tabs up without a round trip.
          const listed = await runtime.agent.invoke_evaluate({
            expression: 'JSON.stringify(globalThis[' + JSON.stringify(TABS) + '] || [])',
            returnByValue: true,
          });

          return {
            registered: JSON.parse(listed.result?.value || '[]'),
            send: (message) => {
              const serialized = JSON.stringify(JSON.stringify(message));
              void runtime.agent.invoke_evaluate({
                expression:
                  DISPATCHER + '.sendMessage(' + JSON.stringify(DOMAIN) + ', ' + serialized + ')',
              });
            },
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
    super(tab.name + ' ' + (tab.icon || '\u235A'), true, tab.id);
    // Keeps the iframe alive when another tab is selected, so a tab does not lose everything it has
    // been sent every time somebody looks at Console.
    this.setHideOnDetach();

    const iframe = document.createElement('iframe');
    iframe.src = '${ROUTE}/panel/index.html?tab=' + encodeURIComponent(tab.id);
    iframe.style.cssText = 'width:100%;height:100%;border:0';
    this.contentElement.appendChild(iframe);
    this.iframe = iframe;
  }
}

const main = async () => {
  await waitForFrontend();

  const inspector = UI.InspectorView.InspectorView.instance();
  const panels = new Map();

  const addPanel = (tab) => {
    if (!tab?.id || panels.has(tab.id)) return;
    const panel = new TabPanel(tab);
    panels.set(tab.id, panel);
    inspector.addPanel(panel);
  };

  const connected = await connectToApp((message) => {
    const body = message?.data;

    // Every message the app sends names the tab it is for, so this is a lookup rather than a
    // fan-out. Broadcasting meant an app with five tabs posted five copies of every render and four
    // of them were dropped on arrival. A message with no id has no addressee, so it still goes to
    // everyone.
    if (body?.id != null) {
      panels.get(body.id)?.iframe.contentWindow?.postMessage(message, '*');
    } else {
      for (const panel of panels.values()) {
        panel.iframe.contentWindow?.postMessage(message, '*');
      }
    }

    // A tab registered after this frontend connected, so it was not in the list that was read.
    if (message?.type === 'tab:register') addPanel(body);
  });

  if (!connected) {
    console.warn('[devtools] the app never installed its devtools dispatcher');
    return;
  }

  // The tabs the app already had. Each page asks for its own registration once it loads, so nothing
  // has to be replayed at them here.
  for (const tab of connected.registered) addPanel(tab);
  const send = connected.send;

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
  const renderer = path.join(
    path.dirname(
      require.resolve("@axonpack/react-native-devtools-tab/package.json"),
    ),
    "dist/renderer",
  );

  pointDebuggerAt(roots);

  /** Answers one of our routes, or reports that the request was not ours. */
  const handle = (request: Incoming, response: Outgoing): boolean => {
    const url = (request.url ?? "").split("?")[0];
    if (!url.startsWith(base)) return false;

    const rest = url.slice(base.length) || "/";

    if (rest === "/host.js") {
      serve(response, hostScript(), "application/javascript");
      return true;
    }

    // `/panel/...` is the page this package ships, everything else is the real DevTools frontend.
    const inPanel = rest.startsWith("/panel/");
    sendFile(
      inPanel ? renderer : frontend,
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
