import {
  ACTION,
  HELLO,
  MUTATE,
  REGISTER,
  STATE,
} from "../core/constants/message.const";
import type {
  StateUpdate,
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
import { renderInto } from "./services/render-node.service";
import { resolveLayout, slicesOf } from "./services/resolve-layout.service";

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
 * The layout arrives once; after that only state does, and the page redraws itself the way a
 * component would.
 */
export function startPanel(
  tabId: string,
  root: HTMLElement = document.body,
): MessageChannel {
  const channel = createPanelChannel();

  let layout: TabRegistration["layout"] | null = null;
  let slices = new Set<string>();
  let state: Record<string, unknown> = {};
  let remote: RemoteRoot | null = null;

  const draw = (): void => {
    if (!layout) return;
    renderInto(root, resolveLayout(layout, state), (action, payload) => {
      channel.send(ACTION, { id: tabId, action, payload } satisfies TabAction);
    });
  };

  channel.onMessage(REGISTER, (payload) => {
    const registration = payload as TabRegistration;
    if (registration?.id !== tabId) return;

    // A component is drawn from the changes React made, not from a description, so this tab has
    // nothing to render until they arrive. Re-made on every registration, because one arriving twice
    // means the app is starting the tab over.
    if (registration.remote) {
      root.replaceChildren();
      remote = createRemoteRoot(root, (handler, value) => {
        channel.send(ACTION, {
          id: tabId,
          action: handler,
          payload: value,
        } satisfies TabAction);
      });
      return;
    }

    // A tab with its own page never loads this one, so an absent layout here means a registration
    // that was not meant for us rather than a mistake.
    if (!registration.layout) return;

    layout = registration.layout;
    slices = slicesOf(registration.layout);
    state = registration.state ?? {};
    draw();
  });

  channel.onMessage(STATE, (payload) => {
    const update = payload as StateUpdate;
    if (update?.id !== tabId) return;

    state = { ...state, ...update.state };

    // The point of slices: a tab that does not read what changed does not redraw. With one tab open
    // per DevTools panel, this is also what stops one busy slice redrawing every other tab.
    if (Object.keys(update.state).some((slice) => slices.has(slice))) draw();
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

export { renderInto, renderNode } from "./services/render-node.service";
export { resolveLayout, slicesOf } from "./services/resolve-layout.service";
export type { UiNode, UiTone, Ref } from "../core/constants/ui-node.const";
export { ref } from "../core/constants/ui-node.const";
export type {
  MessageChannel,
  MessageListener,
} from "../core/services/message-channel.service";
