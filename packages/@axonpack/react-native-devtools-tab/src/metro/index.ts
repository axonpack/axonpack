import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import {
  DEVTOOLS_AGENT,
  DEVTOOLS_ID,
  DEVTOOLS_FOCUS,
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
 *   withReactNativeDevtoolsTab,
 * } = require('@axonpack/react-native-devtools-tab/metro');
 *
 * module.exports = withReactNativeDevtoolsTab(getDefaultConfig(__dirname));
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

/** Under DEVTOOLS_ROUTE: where a tool on this computer calls the app's agent global. */
const AGENT_PATH = "/agent";

function hostScript(): string {
  const ROUTE = DEVTOOLS_ROUTE;
  const id = DEVTOOLS_ID;
  const tabs = DEVTOOLS_TABS;
  const focus = DEVTOOLS_FOCUS;
  const agent = DEVTOOLS_AGENT;
  return `
import * as UI from '${ROUTE}/ui/legacy/legacy.js';
import * as SDK from '${ROUTE}/core/sdk/sdk.js';

const DOMAIN = ${JSON.stringify(id)};
const TABS = ${JSON.stringify(tabs)};
const FOCUS = ${JSON.stringify(focus)};
const AGENT = ${JSON.stringify(agent)};
const AGENT_ROUTE = '${ROUTE}${AGENT_PATH}';
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

/**
 * Every character past ASCII as a \\u escape, which a string literal reads back as the same text.
 * A message goes to the app as source for Runtime.evaluate, and source holding an é or an emoji did
 * not arrive: a keystroke in a field that held one was lost, and so was every event after it.
 */
const asciiOnly = (source) =>
  source.replace(/[\\u007f-\\uffff]/g, (char) => '\\\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'));

const getRuntime = () => {
  const targets = SDK.TargetManager.TargetManager.instance();
  const target = targets.primaryPageTarget() ?? targets.rootTarget();
  return target?.model(SDK.RuntimeModel.RuntimeModel) ?? null;
};

/**
 * Takes calls to the app's agent global off the dev server and makes them on this window's own
 * connection, where a second debugger would close this window. Only a method name and a JSON object
 * ever arrive, and the call is built here from them, so nothing else can be evaluated. The stream
 * stays open while the window does, which is how the dev server knows a window is on this page.
 */
const relayAgentCalls = () => {
  const params = new URLSearchParams(location.search);
  const socket = params.get('ws') ?? params.get('wss');
  if (!socket) return;
  // The query of the page's debugger URL, which is how a tool reading /json/list names it too.
  const page = socket.slice(socket.indexOf('?') + 1);
  const calls = new EventSource(AGENT_ROUTE + '/window?page=' + encodeURIComponent(page));
  calls.onmessage = async (event) => {
    const { id, call, arg } = JSON.parse(event.data);
    const target = 'globalThis.' + AGENT;
    const method = JSON.stringify(call);
    let reply;
    try {
      const runtime = getRuntime();
      if (!runtime) throw new Error('this DevTools window is not connected to the app');
      const result = await runtime.agent.invoke_evaluate({
        // Own methods only, so a name like toString reaches nothing of Object's.
        expression: asciiOnly(
          'Object.prototype.hasOwnProperty.call(' + target + ' || {}, ' + method + ') ? ' +
            target + '[' + method + '](' + (arg === undefined ? '' : JSON.stringify(arg)) + ') : null',
        ),
        returnByValue: true,
      });
      const thrown = result.exceptionDetails;
      const failed = result.getError?.();
      reply = thrown
        ? { error: 'the app threw: ' + (thrown.exception?.description ?? thrown.text) }
        : failed
          ? { error: failed }
          : { value: result.result?.value };
    } catch (error) {
      reply = { error: String(error?.message ?? error) };
    }
    void fetch(AGENT_ROUTE + '/reply?id=' + id, { method: 'POST', body: JSON.stringify(reply) });
  };
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

          // Taken rather than read, so a second window opening later starts where it always does.
          const focused = await runtime.agent.invoke_evaluate({
            expression:
              '(() => { const id = globalThis[' + JSON.stringify(FOCUS) + ']; delete globalThis[' +
              JSON.stringify(FOCUS) + ']; return id ?? null; })()',
            returnByValue: true,
          });

          return {
            registered: JSON.parse(listed.result?.value || '[]'),
            focus: focused.result?.value ?? null,
            send: (message) => {
              const serialized = asciiOnly(JSON.stringify(JSON.stringify(message)));
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
    // So a tab can copy to this computer's clipboard. See COPY_ATTRIBUTE in the renderer.
    iframe.allow = 'clipboard-write';
    this.contentElement.appendChild(iframe);
    this.iframe = iframe;
  }
}

const main = async () => {
  await waitForFrontend();

  const inspector = UI.InspectorView.InspectorView.instance();
  const panels = new Map();
  // Held until the tab exists, since the app may ask for one it registers after this connects.
  let wanted = null;

  // The tab strip itself, not \`showPanel\`: that looks the id up among DevTools' own registered
  // views, and ours are added at run time, so it only logs that it found nothing.
  const select = (id) => {
    if (!panels.has(id)) return false;
    inspector.tabbedPane.selectTab(id, true);
    return true;
  };

  const addPanel = (tab) => {
    if (!tab?.id || panels.has(tab.id)) return;
    const panel = new TabPanel(tab);
    panels.set(tab.id, panel);
    inspector.addPanel(panel);
    if (wanted === tab.id && select(tab.id)) wanted = null;
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
    if (message?.type === 'tab:focus' && !select(body?.id)) wanted = body?.id ?? null;
  });

  if (!connected) {
    console.warn('[devtools] the app never installed its devtools dispatcher');
    return;
  }

  // The tabs the app already had. Each page asks for its own registration once it loads, so nothing
  // has to be replayed at them here.
  if (connected.focus) wanted = connected.focus;
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

// Not behind main: a call needs only the connection, not the app's tab dispatcher.
relayAgentCalls();
main().catch((error) => console.error('[devtools] panel failed to start', error));
`;
}

type Incoming = {
  url?: string;
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
  on: (event: string, fn: (chunk?: unknown) => void) => void;
};
type Outgoing = {
  end: (body?: string | Uint8Array) => void;
  setHeader: (name: string, value: string) => void;
  write: (chunk: string) => void;
  on: (event: string, fn: () => void) => void;
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

/**
 * Where to look for the debugger's own packages, in the order that matters.
 *
 * Finding *a* copy is not enough: the frontend has to be the one the dev server serves, and the
 * middleware has to be the one it will call, or the shortcut is rewritten on an object nobody
 * loads and DevTools opens without the tab script in it. An install can easily hold three copies,
 * which is what happens the moment a project updates React Native and something else stays behind.
 *
 * So the search starts at whatever is serving: `@expo/cli` for an Expo project, the community CLI
 * plugin for a bare one. They are what `require` these at runtime, so their answer is the right
 * answer. The rest are fallbacks for a layout where neither is installed.
 */
function projectRoots(projectRoot: string): string[] {
  const roots = [projectRoot];
  const found = new Map<string, string>();

  // Resolved against what has been found so far, because `@expo/cli` is usually a dependency of
  // `expo` rather than of the app.
  for (const from of [
    "expo",
    "react-native",
    "@expo/cli",
    "@react-native/community-cli-plugin",
  ]) {
    try {
      const dir = path.dirname(
        require.resolve(`${from}/package.json`, { paths: roots }),
      );
      roots.push(dir);
      found.set(from, dir);
    } catch {
      // Not every project has every one of these. The next candidate may still resolve.
    }
  }

  const serving = [
    "@expo/cli",
    "@react-native/community-cli-plugin",
    "react-native",
    "expo",
  ]
    .map((name) => found.get(name))
    .filter((dir): dir is string => dir !== undefined);

  return [...serving, projectRoot];
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

// A call is a method name and a small JSON object. A reply can be a whole log, so it gets room.
const CALL_LIMIT = 64 * 1024;
const REPLY_LIMIT = 64 * 1024 * 1024;
// The Origin hosts React Native's own debugger socket accepts, plus IPv6 loopback.
const LOOPBACK_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
  "0.0.0.0",
  "[::]",
]);

/**
 * This computer only. The address keeps other machines out. The Origin and Host keep out a web page
 * open in a browser here, which can post to any port on localhost, or reach this one by pointing a
 * domain of its own at 127.0.0.1.
 */
function isLocal(request: Incoming): boolean {
  const address = request.socket?.remoteAddress ?? "";
  if (address !== "::1" && !/^(::ffff:)?127\./.test(address)) return false;
  const { origin, host } = request.headers ?? {};
  return [origin, host === undefined ? undefined : `http://${host}`].every(
    (url) => {
      if (url === undefined) return true;
      try {
        return LOOPBACK_HOSTS.has(new URL(String(url)).hostname);
      } catch {
        return false;
      }
    },
  );
}

/** The body as text, or null once it runs past `limit` bytes. */
function readBody(request: Incoming, limit: number): Promise<string | null> {
  return new Promise((resolve) => {
    const decoder = new TextDecoder();
    let text = "";
    let size = 0;
    request.on("data", (chunk) => {
      size += (chunk as Uint8Array).byteLength;
      if (size <= limit) {
        text += decoder.decode(chunk as Uint8Array, { stream: true });
      }
    });
    request.on("end", () =>
      resolve(size > limit ? null : text + decoder.decode()),
    );
  });
}

function sendJson(response: Outgoing, status: number, body: unknown): void {
  response.statusCode = status;
  serve(response, JSON.stringify(body), "application/json");
}

type AgentCall = { page: string; call: string; arg?: object };

/** Never an expression: a page, a method name, and a JSON object or nothing. */
function parseCall(body: string): AgentCall | null {
  let call: Partial<AgentCall> | null;
  try {
    call = JSON.parse(body);
  } catch {
    return null;
  }
  const arg: unknown = call?.arg;
  const isObject =
    arg === undefined ||
    (typeof arg === "object" && arg !== null && !Array.isArray(arg));
  return typeof call?.page === "string" &&
    typeof call.call === "string" &&
    /^\w+$/.test(call.call) &&
    isObject
    ? (call as AgentCall)
    : null;
}

/**
 * `${DEVTOOLS_ROUTE}/agent`, which calls the app's agent global through the DevTools window open on
 * it. The host script holds `GET /agent/window` open as an event stream for as long as the window
 * lives, takes each call off it, and posts the result to `/agent/reply`.
 */
function createAgentRelay() {
  // The window open on each page, as the stream its host script holds.
  const windows = new Map<string, Outgoing>();
  // Each call sent to a window, holding the request of whoever asked.
  const asking = new Map<number, Outgoing>();
  let lastId = 0;

  return async (
    request: Incoming,
    response: Outgoing,
    path: string,
  ): Promise<void> => {
    if (!isLocal(request)) {
      return sendJson(response, 403, { error: "this computer only" });
    }
    const params = new URLSearchParams((request.url ?? "").split("?")[1]);
    const route = `${request.method} ${path}`;
    const page = params.get("page");

    if (route === `GET ${AGENT_PATH}`) {
      return sendJson(response, 200, [...windows.keys()]);
    }

    if (route === `GET ${AGENT_PATH}/window` && page) {
      response.setHeader("Content-Type", "text/event-stream");
      // A compression middleware in front would hold the events back without no-transform.
      response.setHeader("Cache-Control", "no-cache, no-transform");
      response.write(": open\n\n");
      // The newest wins: React Native has already disconnected an older window on the page.
      windows.set(page, response);
      response.on("close", () => {
        if (windows.get(page) === response) windows.delete(page);
      });
      return;
    }

    if (route === `POST ${AGENT_PATH}`) {
      const body = await readBody(request, CALL_LIMIT);
      if (body === null) {
        return sendJson(response, 413, { error: "a call is at most 64 KB" });
      }
      const call = parseCall(body);
      if (!call) {
        return sendJson(response, 400, {
          error:
            "expected { page, call, arg }: a method name and a JSON object",
        });
      }
      const stream = windows.get(call.page);
      if (!stream) {
        return sendJson(response, 404, {
          error: "no DevTools window is open on this page",
        });
      }
      const id = ++lastId;
      asking.set(id, response);
      // The asker gave up: its own timeout, or JS paused at a breakpoint.
      response.on("close", () => asking.delete(id));
      stream.write(
        `data: ${JSON.stringify({ id, call: call.call, arg: call.arg })}\n\n`,
      );
      return;
    }

    if (route === `POST ${AGENT_PATH}/reply`) {
      const body = await readBody(request, REPLY_LIMIT);
      const id = Number(params.get("id"));
      const asker = asking.get(id);
      asking.delete(id);
      if (asker && body === null) {
        sendJson(asker, 502, { error: "the reply was over 64 MB" });
      } else if (asker && body !== null) {
        // Passed on as the window wrote it, rather than parsed and written again.
        serve(asker, body, "application/json");
      }
      response.statusCode = 204;
      response.end();
      return;
    }

    sendJson(response, 404, { error: "no such route" });
  };
}

export type ReactNativeDevtoolsTabOptions = {
  /**
   * Where React Native DevTools' own files are, for a layout this cannot work out for itself. A
   * monorepo that hoists oddly is the case that needs it.
   */
  frontendPath?: string;
};

export function withReactNativeDevtoolsTab<
  TConfig extends {
    projectRoot?: string;
    server?: { enhanceMiddleware?: unknown };
  },
>(config: TConfig, options: ReactNativeDevtoolsTabOptions = {}): TConfig {
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
  const relay = createAgentRelay();

  /** Answers one of our routes, or reports that the request was not ours. */
  const handle = (request: Incoming, response: Outgoing): boolean => {
    const url = (request.url ?? "").split("?")[0];
    if (!url.startsWith(base)) return false;

    const rest = url.slice(base.length) || "/";

    if (rest === AGENT_PATH || rest.startsWith(`${AGENT_PATH}/`)) {
      void relay(request, response, rest);
      return true;
    }

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
