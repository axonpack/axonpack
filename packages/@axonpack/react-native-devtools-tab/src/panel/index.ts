import {
  ACTION,
  HELLO,
  MUTATE,
  REGISTER,
} from "../core/constants/message.const";
import type {
  TabAction,
  TabMutation,
  TabRegistration,
} from "../core/constants/message.const";
import {
  createMessageChannel,
  type MessageChannel,
} from "../core/services/message-channel.service";
import {
  createRemoteRoot,
  type RemoteRoot,
} from "./services/apply-remote-ops.service";

/**
 * The panel's half, for the page shown in one tab.
 *
 * The page is an iframe inside a DevTools panel, so messages to the app go up to the host script,
 * which relays them over the debugger connection the frontend already has.
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
    request: channel.request,
    handle: channel.handle,
  };
}

/**
 * Boots the page for one tab.
 *
 * Each DevTools tab loads this page with its own id, and ignores everything addressed to the others.
 * Nothing here decides what the tab looks like: the app's React does, and this builds the elements
 * it asks for.
 */
export function startPanel(
  tabId: string,
  root: HTMLElement = document.body,
): MessageChannel {
  const channel = createPanelChannel();
  let remote: RemoteRoot | null = null;

  channel.onMessage(REGISTER, (payload) => {
    const registration = payload as TabRegistration;
    if (registration?.id !== tabId) return;

    // Re-made on every registration, because one arriving twice means the app is starting over.
    root.replaceChildren();
    remote = createRemoteRoot(root, (handler, value) => {
      channel.send(ACTION, {
        id: tabId,
        action: handler,
        payload: value,
      } satisfies TabAction);
    });
  });

  channel.onMessage(MUTATE, (payload) => {
    const mutation = payload as TabMutation;
    if (mutation?.id === tabId) remote?.apply(mutation.ops);
  });

  // The app almost always started first, so its registration is already gone. Ask for it rather than
  // waiting for the next one, which is also what makes reloading this page recover.
  channel.send(HELLO);

  return channel;
}

export type {
  MessageChannel,
  MessageListener,
} from "../core/services/message-channel.service";
