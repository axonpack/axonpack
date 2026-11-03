import { afterEach, beforeEach, expect, test } from "bun:test";

import {
  DEVTOOLS_AGENT,
  DEVTOOLS_ROUTE,
} from "../../core/constants/devtools.const";
import { withReactNativeDevtoolsTab } from "../index";

const AGENT_ROUTE = `${DEVTOOLS_ROUTE}/agent`;
const PAGE = "device=abc&page=1";

type Handler = (req: unknown, res: unknown, next: () => void) => void;
let handler: Handler;

beforeEach(() => {
  const config = withReactNativeDevtoolsTab(
    { server: {} },
    { frontendPath: "/tmp/none" },
  ) as { server: { enhanceMiddleware: (m: unknown, s: unknown) => Handler } };
  handler = config.server.enhanceMiddleware(() => undefined, null);
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>)[DEVTOOLS_AGENT];
});

/** One request through the real middleware. `done` settles when the response ends. */
function send(
  method: string,
  url: string,
  options: {
    body?: string;
    address?: string;
    origin?: string;
    host?: string;
    onWrite?: (chunk: string) => void;
  } = {},
) {
  const listeners: Record<string, ((chunk?: unknown) => void)[]> = {};
  const closers: (() => void)[] = [];
  let finish!: (body: string) => void;
  const ended = new Promise<string>((resolve) => (finish = resolve));
  const response = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    write: (chunk: string) => options.onWrite?.(chunk),
    end: (body = "") => {
      finish(String(body));
      for (const close of closers) close();
    },
    on: (event: string, fn: () => void) => {
      if (event === "close") closers.push(fn);
    },
  };

  handler(
    {
      url,
      method,
      headers: {
        host: options.host ?? "127.0.0.1:8081",
        ...(options.origin ? { origin: options.origin } : {}),
      },
      socket: { remoteAddress: options.address ?? "::ffff:127.0.0.1" },
      on: (event: string, fn: (chunk?: unknown) => void) =>
        (listeners[event] ??= []).push(fn),
    },
    response,
    () => {
      throw new Error("the route passed the request on");
    },
  );
  if (options.body !== undefined) {
    for (const fn of listeners.data ?? []) {
      fn(new TextEncoder().encode(options.body));
    }
  }
  for (const fn of listeners.end ?? []) fn();

  return {
    response,
    close: () => {
      for (const close of closers) close();
    },
    done: ended.then((body) => ({
      status: response.statusCode,
      body: body ? JSON.parse(body) : undefined,
    })),
  };
}

const ask = (body: unknown, options = {}) =>
  send("POST", AGENT_ROUTE, { body: JSON.stringify(body), ...options }).done;

test("refuses another machine, and a web page on this one", async () => {
  // A machine on the LAN.
  expect(
    (await ask({ page: PAGE, call: "run" }, { address: "192.168.1.9" })).status,
  ).toBe(403);
  // A site open in a browser here, posting across origins.
  expect(
    (await ask({ page: PAGE, call: "run" }, { origin: "https://example.com" }))
      .status,
  ).toBe(403);
  // A site that pointed its own domain at 127.0.0.1.
  expect(
    (await send("GET", AGENT_ROUTE, { host: "rebound.example.com:8081" }).done)
      .status,
  ).toBe(403);
  // IPv6 loopback and the DevTools page's own origin are this computer.
  expect(
    await send("GET", AGENT_ROUTE, {
      address: "::1",
      origin: "http://127.0.0.1:8081",
    }).done,
  ).toEqual({ status: 200, body: [] });
});

test("refuses a body that is not JSON, too big, or not a call with a query object", async () => {
  const post = (body: string) => send("POST", AGENT_ROUTE, { body }).done;

  expect((await post("run({})")).status).toBe(400);
  expect(
    (
      await post(
        JSON.stringify({ page: PAGE, call: "run", arg: "x".repeat(70_000) }),
      )
    ).status,
  ).toBe(413);
  for (const call of [
    { page: PAGE, call: "run({}); globalThis.x = 1; void " },
    { page: PAGE, call: "run", arg: "process.exit()" },
    { page: PAGE, call: "run", arg: ["topic"] },
    { page: PAGE, call: "run", arg: null },
    { call: "run", arg: {} },
  ]) {
    expect((await ask(call)).status).toBe(400);
  }
});

test("says so when no window is open on the page", async () => {
  expect(await ask({ page: PAGE, call: "hello" })).toEqual({
    status: 404,
    body: { error: "no DevTools window is open on this page" },
  });
});

/** The host script's relay, run against the real middleware and a fake DevTools connection. */
function openWindow(evaluate: (expression: string) => unknown) {
  const script = hostScript();
  const asciiOnly = new Function(
    `return ${script.match(/const asciiOnly = ([\s\S]*?);\n/)?.[1]}`,
  )();
  const relay = script.match(/const relayAgentCalls = ([\s\S]*?\n\});\n/)?.[1];
  if (!relay) throw new Error("relayAgentCalls has moved");

  const expressions: string[] = [];
  let stream: ReturnType<typeof send> | undefined;
  class FakeEventSource {
    onmessage?: (event: { data: string }) => void;
    constructor(url: string) {
      stream = send("GET", url, {
        onWrite: (chunk) => {
          const data = /^data: (.*)\n\n$/.exec(chunk)?.[1];
          if (data) this.onmessage?.({ data });
        },
      });
    }
  }
  const runtime = {
    agent: {
      invoke_evaluate: async (params: {
        expression: string;
        returnByValue: boolean;
      }) => {
        expressions.push(params.expression);
        expect(params.returnByValue).toBe(true);
        try {
          return { result: { value: evaluate(params.expression) } };
        } catch (error) {
          return {
            exceptionDetails: {
              text: "Uncaught",
              exception: { description: `${error}\n    at run (app.js:1:1)` },
            },
          };
        }
      },
    },
  };
  const fetch = (url: string, init: { body: string }) =>
    send("POST", url, { body: init.body, origin: "http://127.0.0.1:8081" })
      .done;

  new Function(
    "location",
    "EventSource",
    "fetch",
    "getRuntime",
    "asciiOnly",
    "AGENT",
    "AGENT_ROUTE",
    `return ${relay}`,
  )(
    {
      search: `?ws=${encodeURIComponent(`/inspector/debug?${PAGE}`)}&sources.hide_add_folder=true`,
    },
    FakeEventSource,
    fetch,
    () => runtime,
    asciiOnly,
    DEVTOOLS_AGENT,
    AGENT_ROUTE,
  )();

  return { expressions, close: () => stream?.close() };
}

function hostScript(): string {
  let served = "";
  handler(
    { url: `${DEVTOOLS_ROUTE}/host.js`, method: "GET", on: () => undefined },
    { setHeader: () => undefined, end: (body: string) => (served = body) },
    () => undefined,
  );
  return served;
}

// The app's side: what the expression reaches.
const evalInApp = (expression: string) =>
  new Function(`return ${expression}`)();

test("a window makes the call on its own connection and the asker gets the reply", async () => {
  const agent = {
    run: (query: { topic: string; grep: string }) =>
      `# ${query.topic} · ${query.grep}`,
    hello: () => ({ version: "1.0.0" }),
  };
  (globalThis as Record<string, unknown>)[DEVTOOLS_AGENT] = agent;
  const window = openWindow(evalInApp);

  expect(await send("GET", AGENT_ROUTE).done).toEqual({
    status: 200,
    body: [PAGE],
  });
  expect(
    await ask({
      page: PAGE,
      call: "run",
      arg: { topic: "console", grep: "café 🚀" },
    }),
  ).toEqual({
    status: 200,
    body: { value: "# console · café 🚀" },
  });
  expect(await ask({ page: PAGE, call: "hello" })).toEqual({
    status: 200,
    body: { value: { version: "1.0.0" } },
  });
  // Hermes drops non-ASCII source, so the window sends escapes.
  expect(window.expressions[0]).toMatch(/^[ -~]*$/);

  window.close();
  expect(await send("GET", AGENT_ROUTE).done).toEqual({
    status: 200,
    body: [],
  });
  expect((await ask({ page: PAGE, call: "run", arg: {} })).status).toBe(404);
});

test("only the agent's own methods, and what the app threw comes back as an error", async () => {
  (globalThis as Record<string, unknown>)[DEVTOOLS_AGENT] = {
    run: () => {
      throw new TypeError("no topic");
    },
  };
  const window = openWindow(evalInApp);

  expect(await ask({ page: PAGE, call: "toString" })).toEqual({
    status: 200,
    body: { value: null },
  });
  const threw = await ask({ page: PAGE, call: "run", arg: {} });
  expect(threw.body.error).toStartWith("the app threw: TypeError: no topic\n");

  delete (globalThis as Record<string, unknown>)[DEVTOOLS_AGENT];
  // No agent in the app: a null reply, not an error.
  expect(await ask({ page: PAGE, call: "run", arg: {} })).toEqual({
    status: 200,
    body: { value: null },
  });
  window.close();
});
