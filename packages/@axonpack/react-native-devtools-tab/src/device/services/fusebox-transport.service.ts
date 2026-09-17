/**
 * React Native installs this when a debugger attaches. It is the same channel React DevTools uses,
 * multiplexed by a domain name, which is why every message carries one.
 */
const DISPATCHER = "__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__";

type DomainChannel = {
  name: string;
  sendMessage: (message: unknown) => void;
  onMessage: {
    addEventListener: (listener: (message: unknown) => void) => void;
    removeEventListener: (listener: (message: unknown) => void) => void;
  };
};

type Dispatcher = {
  BINDING_NAME: string;
  initializeDomain: (domain: string) => DomainChannel;
  onDomainInitialization: {
    addEventListener: (listener: (domain: DomainChannel) => void) => void;
    removeEventListener: (listener: (domain: DomainChannel) => void) => void;
  };
};

function getDispatcher(): Dispatcher | undefined {
  return (globalThis as Record<string, unknown>)[DISPATCHER] as
    Dispatcher | undefined;
}

/**
 * The binding only exists once the frontend has asked for it, which happens when the panel opens. So
 * a domain is either already available or arrives later, and both have to be handled: an app started
 * before the panel would otherwise never connect, and a panel opened first would never be answered.
 */
function openDomain(
  dispatcher: Dispatcher,
  domain: string,
): Promise<DomainChannel> {
  return new Promise((resolve) => {
    const handler = (opened: DomainChannel): void => {
      if (opened.name !== domain) return;
      dispatcher.onDomainInitialization.removeEventListener(handler);
      // Resolving straight from this callback never settles under Hermes. Handing it to a timer
      // does, which is the same workaround React Native's own devtools integration uses.
      setTimeout(() => resolve(opened));
    };
    dispatcher.onDomainInitialization.addEventListener(handler);

    // The panel may already be open, in which case the binding exists and nothing more will be
    // emitted, so the domain has to be asked for. Registering the listener first means the emit this
    // triggers is caught by the same path rather than needing a second one.
    if (
      (globalThis as Record<string, unknown>)[dispatcher.BINDING_NAME] != null
    ) {
      dispatcher.initializeDomain(domain);
    }
  });
}

export type FuseboxTransport = {
  post: (envelope: unknown) => void;
  subscribe: (deliver: (value: unknown) => void) => void;
};

/**
 * Waits for the panel, then hands back a transport over React Native's own debugger connection.
 *
 * Resolves only once somebody opens React Native DevTools, which may be never, so callers should not
 * block on it. Returns `null` where there is no dispatcher at all, which is every release build.
 *
 * **The channel has to survive re-initialisation.** `initializeDomain` builds a *new* domain object
 * every time it is called and replaces the dispatcher's entry for that name, so a listener on the
 * old one silently stops receiving. The panel calls it on every page load, and the app calls it too
 * when it starts against an already-open panel, so holding a stale channel is the normal case rather
 * than an edge one.
 */
export async function connectFuseboxTransport(
  domain: string,
): Promise<FuseboxTransport | null> {
  const dispatcher = getDispatcher();
  if (!dispatcher) return null;

  let channel = await openDomain(dispatcher, domain);
  const delivers = new Set<(value: unknown) => void>();

  const receive = (message: unknown): void => {
    // Same timer workaround: a listener that starts a promise misbehaves when called directly.
    setTimeout(() => {
      for (const deliver of delivers) deliver(message);
    });
  };

  channel.onMessage.addEventListener(receive);

  dispatcher.onDomainInitialization.addEventListener((next) => {
    if (next.name !== domain || next === channel) return;
    channel.onMessage.removeEventListener(receive);
    channel = next;
    channel.onMessage.addEventListener(receive);
  });

  return {
    post: (envelope) => channel.sendMessage(envelope),
    subscribe: (deliver) => delivers.add(deliver),
  };
}
