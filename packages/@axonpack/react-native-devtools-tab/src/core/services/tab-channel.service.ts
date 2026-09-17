import type {
  MessageChannel,
  MessageListener,
} from "./message-channel.service";

/** A channel that only ever speaks for one tab, and only hears what is meant for it. */
export type TabChannel = {
  send: (type: string, payload?: object) => void;
  onMessage: (type: string, listener: MessageListener) => () => void;
};

/**
 * Binds a channel to one tab.
 *
 * Both ends carry every tab over one connection, so each message has to name the one it belongs to.
 * Doing that at the call sites meant stamping an id on the way out and comparing it on the way in,
 * in eight places across two engines, where a missed check shows up as one tab drawing another
 * tab's DOM. Here it is in one place and a caller cannot get it wrong.
 */
export function createTabChannel(
  channel: MessageChannel,
  id: string,
): TabChannel {
  return {
    send: (type, payload) => channel.send(type, { ...payload, id }),

    onMessage: (type, listener) =>
      channel.onMessage(type, (payload) => {
        if ((payload as { id?: unknown } | undefined)?.id === id)
          listener(payload);
      }),
  };
}
