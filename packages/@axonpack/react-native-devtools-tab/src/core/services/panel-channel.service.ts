import {
  createMessageChannel,
  type MessageChannel,
} from "./message-channel.service";

/**
 * The browser end of the channel, for the page shown in a tab.
 *
 * The page is an iframe inside a DevTools panel, so messages to the app go up to the host script,
 * which relays them over the debugger connection the frontend already has.
 *
 * In `core` rather than beside the renderer because it draws nothing. The renderer is built on it,
 * and so is any page a consumer serves themselves.
 */
export function createPanelChannel(): MessageChannel {
  const channel = createMessageChannel({
    post: (envelope) => window.parent.postMessage(envelope, "*"),
    subscribe: (deliver) => {
      window.addEventListener("message", (event: MessageEvent) =>
        deliver(event.data),
      );
    },
  });

  return {
    send: channel.send,
    onMessage: channel.onMessage,
  };
}
