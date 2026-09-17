import {
  ACTION,
  HELLO,
  MUTATE,
  REGISTER,
} from "../core/constants/message.const";
import type { TabAction, TabMutation } from "../core/constants/message.const";
import { createPanelChannel } from "../core/services/panel-channel.service";
import {
  createTabChannel,
  type TabChannel,
} from "../core/services/tab-channel.service";
import {
  createRemoteReceiver,
  type RemoteReceiver,
} from "./services/remote-receiver.service";

/**
 * Boots the page for one tab.
 *
 * Each DevTools tab loads this page with its own id, and the channel is bound to it, so nothing here
 * has to check who a message was for. Nothing here decides what the tab looks like either: the app's
 * React does, and this builds the elements it asks for.
 */
export function startRenderer(
  tabId: string,
  root: HTMLElement = document.body,
): TabChannel {
  const channel = createTabChannel(createPanelChannel(), tabId);
  let remote: RemoteReceiver | null = null;

  // Re-made on every registration, because one arriving twice means the app is starting over.
  channel.onMessage(REGISTER, () => {
    root.replaceChildren();
    remote = createRemoteReceiver(root, (handler, value) =>
      channel.send(ACTION, {
        action: handler,
        payload: value,
      } satisfies TabAction),
    );
  });

  channel.onMessage(MUTATE, (payload) => {
    remote?.apply((payload as TabMutation).ops);
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
export { createTabChannel } from "../core/services/tab-channel.service";
export type { TabChannel } from "../core/services/tab-channel.service";
