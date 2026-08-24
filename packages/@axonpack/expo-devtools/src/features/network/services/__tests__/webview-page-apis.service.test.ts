import {
  getWebViewInjectedJavaScriptBeforeContentLoaded,
  handleWebViewNetworkMessage,
  setWebViewStreamCapture,
} from '../webview-network-logger.service';
import { networkLogStore } from '../../stores/network-log.store';

const MARKER = '__bruinDevtoolsNetwork';

function event(type: string, payload: Record<string, unknown>) {
  return {
    nativeEvent: { data: JSON.stringify({ [MARKER]: true, type, source: 'shop', payload }) },
  };
}

/** A stand-in for the page's own stream, so the injected script can be run rather than read. */
class FakeEventSource {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  closed = false;
  #listeners: Record<string, ((e?: unknown) => void)[]> = {};

  constructor(
    readonly url: string,
    readonly config?: unknown
  ) {}

  addEventListener(type: string, listener: (e?: unknown) => void) {
    (this.#listeners[type] ??= []).push(listener);
  }

  close() {
    this.closed = true;
  }

  emit(type: string, e?: unknown) {
    for (const listener of this.#listeners[type] ?? []) listener(e);
  }
}

type Relayed = { type: string; payload: Record<string, unknown> };

/**
 * Enough of a page's own XHR for the injected patch to wrap, built fresh per run: the patch replaces
 * methods on the prototype it is handed, so one shared class would arrive already patched by the
 * previous test.
 */
function createFakeXHRClass() {
  return class FakePageXHR {
    static readonly HEADERS_RECEIVED = 2;
    static readonly DONE = 4;

    readyState = 0;
    status = 0;
    statusText = '';
    responseText = '';
    responseType = '';
    listeners: Record<string, ((event: unknown) => void)[]> = {};

    open() {}
    send() {}
    removeEventListener() {}

    addEventListener(type: string, listener: (event: unknown) => void) {
      (this.listeners[type] ??= []).push(listener);
    }

    getAllResponseHeaders() {
      return 'content-type: application/json';
    }

    getResponseHeader() {
      return 'application/json';
    }

    /** The two states the patch reads, driven the way an engine would drive them. */
    reach(state: number) {
      this.readyState = state;
      if (state === FakePageXHR.DONE) {
        this.status = 200;
        this.statusText = 'OK';
        this.responseText = '{"ok":true}';
      }
      for (const listener of this.listeners.readystatechange ?? []) {
        listener({ currentTarget: this });
      }
    }
  };
}

/** Enough of a Response for the page-side patch to read: headers, a status, and a cloneable body. */
function fakeResponse() {
  return {
    status: 200,
    statusText: 'OK',
    headers: {
      forEach: (visit: (value: string, key: string) => void) =>
        visit('application/json', 'content-type'),
    },
    clone: () => ({ text: () => Promise.resolve('{"ok":true}') }),
  };
}

function runInFakePage(resourceEntry?: Record<string, number | string>) {
  const posted: Relayed[] = [];
  const win: Record<string, unknown> = {
    EventSource: FakeEventSource,
    XMLHttpRequest: createFakeXHRClass(),
    fetch: () => Promise.resolve(fakeResponse()),
    location: { href: 'https://page.test/shop' },
    navigator: {},
    performance: {
      getEntriesByName: () => (resourceEntry ? [resourceEntry] : []),
    },
    document: { cookie: 'session=abc; theme=dark' },
    ReactNativeWebView: {
      postMessage: (json: string) => posted.push(JSON.parse(json) as Relayed),
    },
  };

  // eslint-disable-next-line no-new-func
  new Function(
    'window',
    'document',
    'performance',
    getWebViewInjectedJavaScriptBeforeContentLoaded('shop')
  )(win, win.document, win.performance);

  return {
    posted,
    EventSourceCtor: win.EventSource as typeof FakeEventSource,
    XHRCtor: win.XMLHttpRequest as ReturnType<typeof createFakeXHRClass>,
    fetch: win.fetch as (url: string) => Promise<unknown>,
  };
}

describe('a stream opened by a WebView page', () => {
  // The script is a stub until the store is on — nothing is injected before `init()`, by design.
  beforeAll(() => networkLogStore.setEnabled(true));

  it('replaces the page’s EventSource without breaking instanceof', () => {
    const { EventSourceCtor } = runInFakePage();
    const stream = new EventSourceCtor('/live');

    expect(EventSourceCtor).not.toBe(FakeEventSource);
    expect(stream).toBeInstanceOf(FakeEventSource);
    expect(EventSourceCtor.CLOSED).toBe(2);
  });

  it('relays the connection, its events and its close', () => {
    const { posted, EventSourceCtor } = runInFakePage();
    const stream = new EventSourceCtor('/live') as unknown as FakeEventSource;

    stream.emit('open');
    stream.emit('message', { data: 'tick', lastEventId: '7' });
    stream.close();

    const relayed = posted.filter((message) => message.type === 'eventsource');
    expect(relayed.map((message) => message.payload.event)).toEqual([
      'connect',
      'open',
      'message',
      'close',
    ]);
    // A page asks for plenty of relative URLs, and a row has to show where it actually went.
    expect(relayed[0]?.payload.url).toBe('https://page.test/live');
    expect(relayed[2]?.payload).toMatchObject({ data: 'tick', lastEventId: '7', type: 'message' });
  });

  // A named event is only delivered to a listener that asked for that name, which a wrapper cannot
  // know in advance — so the page asking is what tells us to watch it.
  it('picks up a named event when the page listens for it', () => {
    const { posted, EventSourceCtor } = runInFakePage();
    const stream = new EventSourceCtor('/live') as unknown as FakeEventSource;

    stream.addEventListener('price', () => {});
    stream.emit('price', { data: '42' });

    const last = posted.filter((message) => message.type === 'eventsource').at(-1);
    expect(last?.payload).toMatchObject({ event: 'message', type: 'price', data: '42' });
  });

  it('still closes the page’s own stream', () => {
    const { EventSourceCtor } = runInFakePage();
    const stream = new EventSourceCtor('/live') as unknown as FakeEventSource;

    stream.close();

    expect(stream.closed).toBe(true);
  });
});

// A page's stream has no HTTP request underneath it that anything here can see — its row is minted by
// the wrapper — so turning streams off has to keep the wrapper out of the page altogether.
describe('a page with streams turned off', () => {
  beforeAll(() => networkLogStore.setEnabled(true));
  afterEach(() => setWebViewStreamCapture(true));

  it('is never handed the wrapper', () => {
    setWebViewStreamCapture(false);

    // The comment above the block names the API, so the wrapper itself is what is looked for.
    expect(getWebViewInjectedJavaScriptBeforeContentLoaded('shop')).not.toContain(
      'PatchedEventSource'
    );
  });

  it('is ignored if it relays one anyway, having been injected before the switch', () => {
    setWebViewStreamCapture(false);
    networkLogStore.clear();

    handleWebViewNetworkMessage(
      event('eventsource', { id: 'shop-es-off', event: 'connect', url: 'https://page.test/live' })
    );

    expect(networkLogStore.getSnapshot()).toEqual([]);
  });
});

describe('the relay for a page’s stream', () => {
  beforeAll(() => networkLogStore.setEnabled(true));
  beforeEach(() => networkLogStore.clear());

  it('becomes a stream row with its events beside it', () => {
    handleWebViewNetworkMessage(
      event('eventsource', {
        id: 'shop-es-1',
        event: 'connect',
        url: 'https://page.test/live',
        startedAt: 1000,
      })
    );
    handleWebViewNetworkMessage(
      event('eventsource', { id: 'shop-es-1', event: 'message', type: 'price', data: '42' })
    );

    const entry = networkLogStore.getSnapshot()[0];
    expect(entry).toMatchObject({
      eventStream: true,
      method: 'GET',
      url: 'https://page.test/live',
      source: 'shop',
      status: 'pending',
    });
    expect(networkLogStore.getStreamEvents('shop-es-1')).toMatchObject([
      { type: 'price', data: '42' },
    ]);
  });

  it('ends the row when the page closes the stream', () => {
    handleWebViewNetworkMessage(
      event('eventsource', { id: 'shop-es-2', event: 'connect', url: 'x' })
    );
    handleWebViewNetworkMessage(
      event('eventsource', { id: 'shop-es-2', event: 'close', duration: 90 })
    );

    expect(networkLogStore.getSnapshot()[0]).toMatchObject({ status: 'success', duration: 90 });
  });

  // The spec gives an error event no detail, and the engine may still reconnect.
  it('notes an error without calling the stream finished', () => {
    handleWebViewNetworkMessage(
      event('eventsource', { id: 'shop-es-3', event: 'connect', url: 'x' })
    );
    handleWebViewNetworkMessage(event('eventsource', { id: 'shop-es-3', event: 'error' }));

    expect(networkLogStore.getSnapshot()[0]).toMatchObject({
      status: 'pending',
      error: 'Stream error',
    });
  });
});

describe('what the page can see of a request', () => {
  beforeAll(() => networkLogStore.setEnabled(true));
  beforeEach(() => networkLogStore.clear());

  // A page cannot read the Cookie header its engine writes, and an HttpOnly cookie is invisible to it
  // — so this is the document's own jar, kept apart from the request's headers for that reason.
  it('keeps the page’s own cookies apart from the request’s', () => {
    handleWebViewNetworkMessage(
      event('network', {
        id: 'r1',
        status: 'pending',
        url: 'https://page.test/api',
        method: 'GET',
        startedAt: 1,
        requestHeaders: { accept: 'application/json' },
        pageCookies: 'session=abc; theme=dark',
      })
    );

    const entry = networkLogStore.getSnapshot()[0];
    expect(entry?.pageCookies).toBe('session=abc; theme=dark');
    expect(entry?.requestHeaders?.cookie).toBeUndefined();
  });

  it('takes the phases and sizes the engine measured', () => {
    handleWebViewNetworkMessage(
      event('network', { id: 'r2', status: 'pending', url: 'x', method: 'GET', startedAt: 1 })
    );
    handleWebViewNetworkMessage(
      event('network', {
        id: 'r2',
        status: 'success',
        phases: {
          dnsMs: 4,
          tcpMs: 9,
          tlsMs: 30,
          waitMs: 120,
          downloadMs: 8,
          measuredBy: 'webview',
        },
        transfer: { wireBytes: 900, decodedBytes: 7000 },
      })
    );

    expect(networkLogStore.getSnapshot()[0]).toMatchObject({
      phases: { measuredBy: 'webview', dnsMs: 4, tlsMs: 30 },
      transfer: { wireBytes: 900, decodedBytes: 7000 },
    });
  });
});

// A page's request is timed by its engine where the engine will say, and from JavaScript where it
// won't — which is most cross-origin traffic. Without this the Timing tab had one number for those.
describe('what a page can time itself', () => {
  beforeAll(() => networkLogStore.setEnabled(true));

  it('reports the wait from its own fetch resolving', async () => {
    const { posted, fetch } = runInFakePage();

    await fetch('https://api.test/thing');

    const done = posted
      .filter((message) => message.type === 'network')
      .map((message) => message.payload)
      .find((payload) => payload.status === 'success');
    expect(typeof done?.ttfb).toBe('number');
    expect(typeof done?.duration).toBe('number');
  });

  it('reports the wait when its own XHR has the headers, before the body is in', () => {
    const { posted, XHRCtor } = runInFakePage();
    const xhr = new XHRCtor();

    xhr.open();
    xhr.send();
    xhr.reach(2);

    const networkPayloads = () =>
      posted.filter((message) => message.type === 'network').map((message) => message.payload);
    // Second message, and it carries nothing but the reading: the row it patches is already open.
    expect(networkPayloads()[1]).toMatchObject({ ttfb: expect.any(Number) });
    expect(networkPayloads()[1]?.status).toBeUndefined();

    xhr.reach(4);
    expect(networkPayloads()[2]).toMatchObject({ status: 'success', statusCode: 200 });
  });
});

describe('the engine’s own resource timing', () => {
  beforeAll(() => networkLogStore.setEnabled(true));

  /** What a page's `PerformanceResourceTiming` looks like for a fresh cross-origin fetch. */
  const RESOURCE = {
    fetchStart: 100,
    domainLookupStart: 104,
    domainLookupEnd: 108,
    connectStart: 108,
    secureConnectionStart: 117,
    connectEnd: 147,
    requestStart: 147,
    responseStart: 267,
    responseEnd: 275,
    encodedBodySize: 900,
    decodedBodySize: 7000,
    nextHopProtocol: 'h2',
  };

  it('turns an entry into phases the waterfall can draw', async () => {
    const { posted, fetch } = runInFakePage(RESOURCE);

    await fetch('https://api.test/thing');
    // The lookup is deferred a turn, because the entry is recorded when the response completes.
    await new Promise((resolve) => setTimeout(resolve, 0));

    const timing = posted.find((message) => (message.payload as { phases?: unknown })?.phases);
    expect(timing?.payload.phases).toMatchObject({
      queuedMs: 4,
      dnsMs: 4,
      tcpMs: 9,
      tlsMs: 30,
      waitMs: 120,
      downloadMs: 8,
      protocol: 'h2',
      measuredBy: 'webview',
    });
    expect(timing?.payload.transfer).toEqual({ wireBytes: 900, decodedBytes: 7000 });
  });

  // Every detailed field is zeroed for a cross-origin response whose server sent no
  // Timing-Allow-Origin, and a zero there means "not available" rather than "took no time".
  it('sends nothing at all when the entry measured nothing', async () => {
    const { posted, fetch } = runInFakePage({
      fetchStart: 100,
      domainLookupStart: 0,
      domainLookupEnd: 0,
      connectStart: 0,
      secureConnectionStart: 0,
      connectEnd: 0,
      requestStart: 0,
      responseStart: 0,
      responseEnd: 0,
      encodedBodySize: 0,
      decodedBodySize: 0,
      nextHopProtocol: '',
    });

    await fetch('https://api.test/thing');
    await new Promise((resolve) => setTimeout(resolve, 0));

    const timing = posted.find(
      (message) => (message.payload as { phases?: unknown } | undefined)?.phases !== undefined
    );
    expect(timing).toBeUndefined();
  });
});
