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
import { createRemoteReceiver } from "./services/remote-receiver.service";

/**
 * Boots the page for one tab.
 *
 * Each DevTools tab loads this page with its own id, and the channel is bound to it, so nothing here
 * has to check who a message was for. Nothing here decides what the tab looks like either: the app's
 * React does, its bar included, and this builds the elements it asks for.
 */
export function startRenderer(
  tabId: string,
  root: HTMLElement = document.body,
): TabChannel {
  const channel = createTabChannel(createPanelChannel(), tabId);

  const mount = () => {
    root.replaceChildren();
    return createRemoteReceiver(root, (handler, value) =>
      channel.send(ACTION, {
        action: handler,
        payload: value,
      } satisfies TabAction),
    );
  };

  let remote = mount();

  // A registration arriving now means the app is starting over, so what is drawn belongs to an
  // engine that is gone, and the component that drew it went with it. Throwing the DOM away is only
  // half of that: the app mounts a tab when it is asked to and nothing asks on its behalf, so asking
  // again here is what gets it drawn a second time. Without it an app reload left every tab that had
  // already been opened blank until its page was reloaded too.
  channel.onMessage(REGISTER, () => {
    remote = mount();
    channel.send(HELLO);
  });

  channel.onMessage(MUTATE, (payload) => {
    remote.apply((payload as TabMutation).ops);
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
