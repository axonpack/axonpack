import {
  closeWebViewPage,
  getWebViewInjectedJavaScriptBeforeContentLoaded,
  handleWebViewNetworkMessage,
} from '../webview-network-logger.service';
import { networkLogStore } from '../../stores/network-log.store';

/** The wire marker, spelled out here because the contract is with a page rather than with a module. */
const MARKER = '__bruinDevtoolsNetwork';

function pageMessage(type: string, pageId: string, payload?: Record<string, unknown>) {
  return {
    nativeEvent: {
      data: JSON.stringify({ [MARKER]: true, type, source: 'shop', pageId, payload }),
    },
  };
}

/** A socket event from page `p1` unless the payload names another page. */
function socketEvent({ pageId = 'p1', ...payload }: Record<string, unknown>) {
  return pageMessage('websocket', pageId as string, payload);
}

describe('a socket opened inside a WebView', () => {
  beforeAll(() => networkLogStore.setEnabled(true));
  beforeEach(() => networkLogStore.clear());

  function connect() {
    handleWebViewNetworkMessage(
      socketEvent({
        socketId: 1,
        event: 'connect',
        url: 'wss://echo.test/socket',
        protocols: ['chat'],
      })
    );
    return networkLogStore.getWebSocketSnapshot()[0];
  }

  it('becomes a row in the same list the app’s own sockets are in', () => {
    expect(connect()).toMatchObject({
      kind: 'websocket',
      method: 'WS',
      url: 'wss://echo.test/socket',
      protocols: ['chat'],
      status: 'connecting',
      // Which page it came from, since that is the only thing telling it apart from a native socket.
      source: 'shop',
    });
  });

  it('follows the socket through its lifecycle', () => {
    const id = connect()!.id;

    handleWebViewNetworkMessage(socketEvent({ socketId: 1, event: 'open' }));
    expect(networkLogStore.getWebSocketSnapshot()[0]?.status).toBe('open');

    handleWebViewNetworkMessage(
      socketEvent({ socketId: 1, event: 'close', code: 1000, reason: 'done', duration: 42 })
    );
    expect(networkLogStore.getWebSocketSnapshot()[0]).toMatchObject({
      id,
      status: 'closed',
      closeCode: 1000,
      closeReason: 'done',
      duration: 42,
    });
  });

  it('records both directions of traffic', () => {
    const id = connect()!.id;

    handleWebViewNetworkMessage(
      socketEvent({
        socketId: 1,
        event: 'message',
        direction: 'sent',
        data: 'ping',
        messageType: 'text',
      })
    );
    handleWebViewNetworkMessage(
      socketEvent({
        socketId: 1,
        event: 'message',
        direction: 'received',
        data: '[binary 4 bytes]',
        messageType: 'binary',
      })
    );

    expect(networkLogStore.getWebSocketMessages(id)).toMatchObject([
      { direction: 'sent', data: 'ping', messageType: 'text' },
      { direction: 'received', data: '[binary 4 bytes]', messageType: 'binary' },
    ]);
  });

  it('keeps two sockets from one page apart', () => {
    connect();
    handleWebViewNetworkMessage(
      socketEvent({ socketId: 2, event: 'connect', url: 'wss://echo.test/two' })
    );

    expect(networkLogStore.getWebSocketSnapshot().map((entry) => entry.url)).toEqual([
      'wss://echo.test/two',
      'wss://echo.test/socket',
    ]);
  });

  // A reload starts the page's counter again, so the new socket comes back as socket 1 while the old
  // row is still in the list. Only the page token tells the two apart.
  it('keeps a reloaded page’s socket on a row of its own', () => {
    connect();
    handleWebViewNetworkMessage(
      socketEvent({ pageId: 'p2', socketId: 1, event: 'connect', url: 'wss://echo.test/again' })
    );
    handleWebViewNetworkMessage(socketEvent({ pageId: 'p2', socketId: 1, event: 'open' }));

    const [reloaded, old] = networkLogStore.getWebSocketSnapshot();
    expect(reloaded?.id).not.toBe(old?.id);
    expect(reloaded).toMatchObject({ url: 'wss://echo.test/again', status: 'open' });
    expect(old).toMatchObject({ url: 'wss://echo.test/socket', status: 'connecting' });
  });

  it('sends a reloaded page’s messages and close to its own row only', () => {
    const oldId = connect()!.id;
    handleWebViewNetworkMessage(
      socketEvent({ pageId: 'p2', socketId: 1, event: 'connect', url: 'wss://echo.test/socket' })
    );
    const newId = networkLogStore.getWebSocketSnapshot()[0]!.id;

    handleWebViewNetworkMessage(
      socketEvent({ pageId: 'p2', socketId: 1, event: 'message', direction: 'received', data: 'x' })
    );
    handleWebViewNetworkMessage(socketEvent({ pageId: 'p2', socketId: 1, event: 'close' }));

    expect(networkLogStore.getWebSocketMessages(newId)).toHaveLength(1);
    expect(networkLogStore.getWebSocketMessages(oldId)).toHaveLength(0);
    const statuses = Object.fromEntries(
      networkLogStore.getWebSocketSnapshot().map((entry) => [entry.id, entry.status])
    );
    expect(statuses).toEqual({ [oldId]: 'connecting', [newId]: 'closed' });
  });

  it('says a socket failed when the page reports an error', () => {
    connect();
    handleWebViewNetworkMessage(
      socketEvent({ socketId: 1, event: 'error', error: 'Socket error' })
    );

    expect(networkLogStore.getWebSocketSnapshot()[0]).toMatchObject({
      status: 'error',
      error: 'Socket error',
    });
  });

  /**
   * There is no list of accepted names any more: whatever the page calls itself becomes the label on
   * the row. Only our own marker decides whether a message is ours at all.
   */
  it('logs a socket from any source, labelled with the name it gave', () => {
    const handled = handleWebViewNetworkMessage(
      socketEvent({ socketId: 1, event: 'connect', url: 'wss://elsewhere.test' })
    );

    expect(handled).toBe(true);
    expect(networkLogStore.getWebSocketSnapshot()[0]).toMatchObject({ source: 'shop' });
  });
});

describe('the injected script', () => {
  // The script is a string built from templates, so a stray quote or backtick in a comment breaks the
  // page rather than the build. Parsing it here is what catches that.
  it('parses as JavaScript', () => {
    const script = getWebViewInjectedJavaScriptBeforeContentLoaded('shop');

    expect(script).toContain('WebSocket');
    // The parser is the assertion, which is the one legitimate use of this constructor here.
    // eslint-disable-next-line no-new-func
    expect(() => new Function(script)).not.toThrow();
  });
});

/** A stand-in for the page's own socket, so the injected script can be run rather than read. */
class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly sent: unknown[] = [];
  #listeners: Record<string, ((event?: unknown) => void)[]> = {};

  constructor(
    readonly url: string,
    readonly protocols?: string | string[]
  ) {}

  addEventListener(type: string, listener: (event?: unknown) => void) {
    (this.#listeners[type] ??= []).push(listener);
  }

  send(data: unknown) {
    this.sent.push(data);
  }

  emit(type: string, event?: unknown) {
    for (const listener of this.#listeners[type] ?? []) listener(event);
  }
}

describe('the injected script, run against a page', () => {
  type Relayed = { type: string; source: string; payload: Record<string, unknown> };

  function runInFakePage() {
    const posted: Relayed[] = [];
    const win: Record<string, unknown> = {
      WebSocket: FakeWebSocket,
      location: { href: 'https://page.test/shop' },
      navigator: {},
      ReactNativeWebView: {
        postMessage: (json: string) => posted.push(JSON.parse(json) as Relayed),
      },
    };

    // eslint-disable-next-line no-new-func
    new Function('window', getWebViewInjectedJavaScriptBeforeContentLoaded('shop'))(win);

    return { posted, WebSocketCtor: win.WebSocket as typeof FakeWebSocket };
  }

  // Each run is a fresh document: what a reload, a navigation, or a second WebView with the same
  // name all look like from here.
  it('gives every page’s sockets their own rows', () => {
    networkLogStore.clear();
    const pages = [runInFakePage(), runInFakePage()];

    pages.forEach(({ WebSocketCtor }) => new WebSocketCtor('wss://echo.test/socket'));
    for (const { posted } of pages) {
      for (const message of posted) {
        handleWebViewNetworkMessage({ nativeEvent: { data: JSON.stringify(message) } });
      }
    }

    const ids = networkLogStore.getWebSocketSnapshot().map((entry) => entry.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it('replaces the page’s WebSocket, and keeps its constants', () => {
    const { WebSocketCtor } = runInFakePage();

    expect(WebSocketCtor).not.toBe(FakeWebSocket);
    expect(WebSocketCtor.OPEN).toBe(1);
  });

  // The wrapper hands back a real socket, so anything the page checks against still passes.
  it('leaves instanceof intact for the page', () => {
    const { WebSocketCtor } = runInFakePage();
    const socket = new WebSocketCtor('wss://echo.test/socket');

    expect(socket).toBeInstanceOf(FakeWebSocket);
    expect(socket).toBeInstanceOf(WebSocketCtor);
  });

  it('relays the connection, both directions, and the close', () => {
    const { posted, WebSocketCtor } = runInFakePage();
    const socket = new WebSocketCtor('/live', ['chat']) as unknown as FakeWebSocket;

    socket.emit('open');
    socket.send('ping');
    socket.emit('message', { data: 'pong' });
    socket.emit('close', { code: 1001, reason: 'going away' });

    const sockets = posted.filter((message) => message.type === 'websocket');
    expect(sockets.map((message) => message.payload.event)).toEqual([
      'connect',
      'open',
      'message',
      'message',
      'close',
    ]);
    // A page asks for plenty of relative URLs, and a row has to show where it actually went.
    expect(sockets[0]?.payload).toMatchObject({
      url: 'https://page.test/live',
      protocols: ['chat'],
    });
    expect(sockets[2]?.payload).toMatchObject({ direction: 'sent', data: 'ping' });
    expect(sockets[3]?.payload).toMatchObject({ direction: 'received', data: 'pong' });
    expect(sockets[4]?.payload).toMatchObject({ code: 1001, reason: 'going away' });
  });

  it('still delivers what the page sent', () => {
    const { WebSocketCtor } = runInFakePage();
    const socket = new WebSocketCtor('wss://echo.test/socket') as unknown as FakeWebSocket;

    socket.send('hello');

    expect(socket.sent).toEqual(['hello']);
  });

  it('describes a binary frame by its size rather than pretending to read it', () => {
    const { posted, WebSocketCtor } = runInFakePage();
    const socket = new WebSocketCtor('wss://echo.test/socket') as unknown as FakeWebSocket;

    socket.send(new Uint8Array([1, 2, 3, 4]));

    const frame = posted.filter((message) => message.type === 'websocket').at(-1);
    expect(frame?.payload).toMatchObject({ messageType: 'binary', data: '[binary 4 bytes]' });
  });
});

describe('rows of a page that went away', () => {
  beforeAll(() => networkLogStore.setEnabled(true));
  beforeEach(() => networkLogStore.clear());

  const webviewA = {};
  const webviewB = {};

  function startPage(webview: object, pageId: string) {
    handleWebViewNetworkMessage(pageMessage('navigation', pageId), webview);
  }

  function openSocket(webview: object, pageId: string, socketId = 1) {
    handleWebViewNetworkMessage(
      pageMessage('websocket', pageId, { socketId, event: 'connect', url: 'wss://echo.test' }),
      webview
    );
    handleWebViewNetworkMessage(
      pageMessage('websocket', pageId, { socketId, event: 'open' }),
      webview
    );
    return networkLogStore.getWebSocketSnapshot()[0]!.id;
  }

  function socket(id: string) {
    return networkLogStore.getWebSocketSnapshot().find((entry) => entry.id === id);
  }

  function request(id: string) {
    return networkLogStore.getSnapshot().find((entry) => entry.id === id);
  }

  it('are closed when the WebView moves to another page, and only that page’s', () => {
    startPage(webviewA, 'p1');
    const oldSocket = openSocket(webviewA, 'p1');
    handleWebViewNetworkMessage(
      pageMessage('eventsource', 'p1', { id: 'shop-es-p1-1', event: 'connect', url: 'x' }),
      webviewA
    );
    handleWebViewNetworkMessage(
      pageMessage('network', 'p1', {
        id: 'shop-p1-1',
        status: 'pending',
        url: 'x',
        method: 'GET',
        startedAt: 1,
      }),
      webviewA
    );

    startPage(webviewA, 'p2');
    const newSocket = openSocket(webviewA, 'p2');

    // What the engine sends on unload, and not an error: the page just left.
    expect(socket(oldSocket)).toMatchObject({
      status: 'closed',
      closeCode: 1001,
      closeReason: 'Page closed',
    });
    expect(request('shop-es-p1-1')).toMatchObject({ status: 'success' });
    expect(request('shop-es-p1-1')?.error).toBeUndefined();
    expect(request('shop-p1-1')).toMatchObject({ canceled: true, error: 'Canceled' });
    expect(socket(newSocket)?.status).toBe('open');
  });

  it('keep the close a socket really had', () => {
    startPage(webviewA, 'p1');
    const id = openSocket(webviewA, 'p1');
    handleWebViewNetworkMessage(
      pageMessage('websocket', 'p1', { socketId: 1, event: 'close', code: 1000, reason: 'done' }),
      webviewA
    );

    startPage(webviewA, 'p2');

    expect(socket(id)).toMatchObject({ status: 'closed', closeCode: 1000, closeReason: 'done' });
  });

  it('are closed when the WebView unmounts', () => {
    startPage(webviewA, 'p1');
    const id = openSocket(webviewA, 'p1');

    closeWebViewPage(webviewA);

    expect(socket(id)).toMatchObject({ status: 'closed', closeReason: 'Page closed' });
  });

  it('are left alone by a second WebView with the same name', () => {
    startPage(webviewA, 'p1');
    const mine = openSocket(webviewA, 'p1');
    startPage(webviewB, 'p2');
    openSocket(webviewB, 'p2');

    startPage(webviewB, 'p3');
    closeWebViewPage(webviewB);

    expect(socket(mine)?.status).toBe('open');
  });
});
