import type { MessageChannel } from "./message-channel.service";

/**
 * Calling the other end as if its functions were local, and offering yours the same way.
 *
 * `request`/`handle` underneath are the whole mechanism; this is the ergonomics. A call site reads
 * `await remote.getUser(id)` instead of `await channel.request('getUser', id)`, and the contract is
 * one type both ends can be checked against instead of a string per call.
 */

/** Anything callable across the channel: arguments and result have to survive being serialised. */
export type RemoteMethods = Record<string, (...params: never[]) => unknown>;

/** The same contract, with every method promised, since the far end is always a round trip away. */
export type Remote<T extends RemoteMethods> = {
  [K in keyof T]: (
    ...params: Parameters<T[K]>
  ) => Promise<Awaited<ReturnType<T[K]>>>;
};

/**
 * A typed handle on what the other end exposed.
 *
 * Nothing is registered or checked when this is built: the proxy turns any property into a request,
 * and an unknown method is an error from the far end rather than a missing function here. That is
 * what lets either side be older than the other without failing at import.
 */
export function createRemote<T extends RemoteMethods>(
  channel: MessageChannel,
): Remote<T> {
  return new Proxy({} as Remote<T>, {
    get(_target, method: string) {
      return (params?: unknown) => channel.request(method, params);
    },
  });
}
