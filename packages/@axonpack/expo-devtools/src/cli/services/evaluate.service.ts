/** What `evaluate` resolves with when the app never answered in time. */
export const NO_REPLY = Symbol('no reply');

/**
 * Hermes drops evaluate source that holds a non-ASCII char, so each one goes as a `\u` escape. The
 * source here is JSON, where that escape means the same char.
 */
export const asciiOnly = (source: string) =>
  source.replace(/[\u007f-￿]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);

type AgentMethod = 'hello' | 'run' | 'act';

/** `__AXONPACK_AGENT__.<method>(arg)`, or null in an app that has no agent installed. */
export function agentCall(method: AgentMethod, arg?: unknown): string {
  const agent = 'globalThis.__AXONPACK_AGENT__';
  const args = arg === undefined ? '' : JSON.stringify(arg);
  return asciiOnly(`${agent} ? ${agent}.${method}(${args}) : null`);
}

/** The Metro route `withDevtools` adds, from `@axonpack/react-native-devtools-tab`. */
export const RELAY_ROUTE = '/axonpack-rn-devtools-tab/agent';

/** A page as the relay names it: the query of its debugger URL, `device=...&page=...`. */
export const pageOf = (url: string) => url.slice(url.indexOf('?') + 1);

/**
 * `socket` attaches a debugger of our own. `window` asks the DevTools window open on the page to
 * make the call on its connection, where a socket of ours would close that window.
 */
export type Way = 'socket' | 'window';

export function callAgent(
  target: { url: string; port: number },
  way: Way,
  method: AgentMethod,
  arg: unknown,
  timeoutMs: number
): Promise<unknown> {
  return way === 'window'
    ? relay(target, method, arg, timeoutMs)
    : evaluate(target, agentCall(method, arg), timeoutMs);
}

async function relay(
  target: { url: string; port: number },
  method: AgentMethod,
  arg: unknown,
  timeoutMs: number
): Promise<unknown> {
  let text: string;
  try {
    const response = await fetch(`http://127.0.0.1:${target.port}${RELAY_ROUTE}`, {
      method: 'POST',
      body: JSON.stringify({ page: pageOf(target.url), call: method, arg }),
      signal: AbortSignal.timeout(Math.max(0, timeoutMs)),
    });
    text = await response.text();
  } catch (error) {
    if ((error as Error).name === 'TimeoutError') return NO_REPLY;
    throw new Error(`could not reach Metro on port ${target.port}`);
  }
  const reply = JSON.parse(text) as { value?: unknown; error?: string };
  if (reply.error !== undefined) throw new Error(String(reply.error).split('\n')[0]);
  return reply.value;
}

/**
 * One `Runtime.evaluate` over a fresh debugger socket, then close. No `Runtime.enable`, so the app
 * sends no events and LogBox is not cleared.
 */
export function evaluate(
  target: { url: string; port: number },
  expression: string,
  timeoutMs: number
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    // dev-middleware refuses a debugger with no Origin, and Expo drops one with any other host,
    // `localhost` included.
    const init = { headers: { Origin: `http://127.0.0.1:${target.port}` } };
    const socket = new WebSocket(target.url, init as unknown as string[]);
    let done = false;
    const finish = (settle: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.close();
      settle();
    };
    // A page paused at a breakpoint holds the evaluate with no error until it resumes.
    const timer = setTimeout(() => finish(() => resolve(NO_REPLY)), Math.max(0, timeoutMs));

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: { expression, returnByValue: true },
        })
      );
    };
    socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id !== 1) return;
      const exception = message.result?.exceptionDetails;
      if (message.error || exception) {
        const why =
          message.error?.message ?? exception.exception?.description ?? exception.text ?? 'failed';
        finish(() => reject(new Error(`the app threw: ${String(why).split('\n')[0]}`)));
      } else {
        finish(() => resolve(message.result?.result?.value));
      }
    };
    socket.onerror = () => finish(() => reject(new Error(`could not attach to ${target.url}`)));
    socket.onclose = (event) => {
      const reason = event.reason ? `: ${event.reason}` : '';
      finish(() => reject(new Error(`the debugger socket closed (${event.code}${reason})`)));
    };
  });
}
