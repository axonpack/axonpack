import {
  getWebViewInjectedJavaScriptBeforeContentLoaded,
  handleWebViewNetworkMessage,
} from '../webview-network-logger.service';
import { networkLogStore } from '../../stores/network-log.store';

/** The wire marker, spelled out here because the contract is with a page rather than with a module. */
const MARKER = '__bruinDevtoolsNetwork';

function socketEvent(payload: Record<string, unknown>) {
  return {
    nativeEvent: {
      data: JSON.stringify({ [MARKER]: true, type: 'websocket', source: 'shop', payload }),
    },
  };
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

  // Any page can post a message wearing our marker, including one nobody here wrote.
  it('ignores a socket from a page that was never declared', () => {
    const handled = handleWebViewNetworkMessage(
      socketEvent({ socketId: 1, event: 'connect', url: 'wss://elsewhere.test' }),
      ['checkout']
    );

    expect(handled).toBe(false);
    expect(networkLogStore.getWebSocketSnapshot()).toHaveLength(0);
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
