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
};

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
  };

  return channel;
}
