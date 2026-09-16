/**
 * A two-way message channel, with no opinion about what crosses it.
 *
 * Both ends of this library use it: the app's side and the panel's side are the same shape, because
 * the panel is a separate JavaScript engine with no access to the app's memory. Everything it shows
 * has to arrive as a message, and anything it wants the app to do has to go back the same way.
 */

export type MessageListener = (payload: unknown) => void;

export type MessageChannel = {
  /** Sends to the other end. Fire and forget. */
  send: (type: string, payload?: unknown) => void;
  /** Listens for what the other end sends. Call the returned function to stop. */
  onMessage: (type: string, listener: MessageListener) => () => void;
  /** Calls a method the other end registered with `handle`, and waits for its answer. */
  request: <TResult = unknown>(
    method: string,
    params?: unknown,
    options?: { timeoutMs?: number },
  ) => Promise<TResult>;
  /** Answers `request` calls for one method. Call the returned function to stop. */
  handle: (method: string, handler: (params: unknown) => unknown) => () => void;
};

/**
 * Request and response ride on one reserved message type rather than on a type per method, so
 * nothing has to be registered up front and a method name is just a string.
 */
const RPC = "__rpc";

type RpcFrame =
  | { kind: "request"; id: string; method: string; params: unknown }
  | { kind: "response"; id: string; result?: unknown; error?: string };

let nextRequestId = 0;

/** Long enough for a slow handler, short enough that a lost reply is noticed. */
const DEFAULT_TIMEOUT_MS = 30_000;

/** The one envelope both ends agree on, so a transport only has to carry an object. */
export type Envelope = { type: string; data: unknown };

export function isEnvelope(value: unknown): value is Envelope {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

export type Transport = {
  post: (envelope: Envelope) => void;
  /** Called with whatever arrived; hand it anything, the channel checks the shape. */
  subscribe: (deliver: (value: unknown) => void) => void;
};

/**
 * Builds a channel over a transport.
 *
 * Messages sent before the transport is ready are kept rather than dropped, in the shape they will
 * go out in: a panel is opened long after an app starts, and the first thing a caller does is
 * usually to send the state it already has.
 */
export function createMessageChannel(
  transport: Transport | null = null,
): MessageChannel & {
  attach: (transport: Transport) => void;
} {
  const listeners = new Map<string, Set<MessageListener>>();
  const backlog: Envelope[] = [];
  let active: Transport | null = null;

  const attach = (next: Transport): void => {
    active = next;
    next.subscribe((value) => {
      if (!isEnvelope(value)) return;
      for (const listener of listeners.get(value.type) ?? [])
        listener(value.data);
    });
    for (const envelope of backlog.splice(0)) next.post(envelope);
  };

  if (transport) attach(transport);

  const pending = new Map<
    string,
    { resolve: (value: never) => void; reject: (why: Error) => void }
  >();
  const handlers = new Map<string, (params: unknown) => unknown>();

  const channel = {
    attach,

    send(type: string, payload?: unknown) {
      const envelope: Envelope = { type, data: payload };
      if (!active) {
        backlog.push(envelope);
        return;
      }
      active.post(envelope);
    },

    onMessage(type: string, listener: MessageListener) {
      const existing = listeners.get(type) ?? new Set<MessageListener>();
      existing.add(listener);
      listeners.set(type, existing);

      return () => {
        listeners.get(type)?.delete(listener);
      };
    },

    request<TResult = unknown>(
      method: string,
      params?: unknown,
      options?: { timeoutMs?: number },
    ): Promise<TResult> {
      const id = `r${(nextRequestId += 1)}`;
      const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

      return new Promise<TResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`"${method}" did not answer in ${timeoutMs}ms.`));
        }, timeoutMs);

        const settle =
          <TArg>(finish: (value: TArg) => void) =>
          (value: TArg) => {
            clearTimeout(timer);
            finish(value);
          };

        pending.set(id, {
          resolve: settle(resolve as (value: never) => void),
          reject: settle(reject),
        });

        channel.send(RPC, {
          kind: "request",
          id,
          method,
          params,
        } satisfies RpcFrame);
      });
    },

    handle(method: string, handler: (params: unknown) => unknown) {
      handlers.set(method, handler);
      return () => {
        handlers.delete(method);
      };
    },
  };

  channel.onMessage(RPC, (payload) => {
    const frame = payload as RpcFrame;

    if (frame?.kind === "request") {
      const handler = handlers.get(frame.method);
      const reply = (
        body: Omit<Extract<RpcFrame, { kind: "response" }>, "kind" | "id">,
      ) =>
        channel.send(RPC, {
          kind: "response",
          id: frame.id,
          ...body,
        } satisfies RpcFrame);

      if (!handler) {
        reply({ error: `No handler for "${frame.method}".` });
        return;
      }

      // A handler may be async, and either half of that can throw. Both come back as one response,
      // so the caller's promise always settles instead of hanging on a mistake at the far end.
      void (async () => {
        try {
          reply({ result: await handler(frame.params) });
        } catch (error) {
          reply({
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })();
      return;
    }

    if (frame?.kind === "response") {
      const waiting = pending.get(frame.id);
      if (!waiting) return;
      pending.delete(frame.id);
      if (frame.error) waiting.reject(new Error(frame.error));
      else waiting.resolve(frame.result as never);
    }
  });

  return channel;
}
