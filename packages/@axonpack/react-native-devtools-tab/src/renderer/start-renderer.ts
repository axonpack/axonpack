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
import type { MessageChannel } from "../core/services/message-channel.service";
import { createPanelChannel } from "../core/services/panel-channel.service";
import {
  createRemoteReceiver,
  type RemoteReceiver,
} from "./services/remote-receiver.service";

/**
 * Boots the page for one tab.
 *
 * Each DevTools tab loads this page with its own id, and ignores everything addressed to the others.
 * Nothing here decides what the tab looks like: the app's React does, and this builds the elements
 * it asks for.
 */
export function startRenderer(
  tabId: string,
  root: HTMLElement = document.body,
): MessageChannel {
  const channel = createPanelChannel();
  let remote: RemoteReceiver | null = null;

  channel.onMessage(REGISTER, (payload) => {
    const registration = payload as TabRegistration;
    if (registration?.id !== tabId) return;

    // Re-made on every registration, because one arriving twice means the app is starting over.
    root.replaceChildren();
    remote = createRemoteReceiver(root, (handler, value) => {
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

export { createPanelChannel } from "../core/services/panel-channel.service";
