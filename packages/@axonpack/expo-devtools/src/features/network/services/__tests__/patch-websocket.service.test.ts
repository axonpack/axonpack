import { DeviceEventEmitter, TurboModuleRegistry } from 'react-native';

import { networkLogStore } from '../../stores/network-log.store';
import { patchWebSocket } from '../patch-websocket.service';

/**
 * Stands in for React Native's own `WebSocketModule`. Injected through `TurboModuleRegistry` rather
 * than by mocking `react-native` wholesale — the preset's own setup calls into that module, so
 * replacing it breaks the environment before a test runs.
 */
const nativeModule = {
  connect: jest.fn(),
  send: jest.fn(),
  sendBinary: jest.fn(),
  close: jest.fn(),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

const realGet = TurboModuleRegistry.get.bind(TurboModuleRegistry);
jest
  .spyOn(TurboModuleRegistry, 'get')
  .mockImplementation((name: string) =>
    name === 'WebSocketModule' ? (nativeModule as never) : realGet(name)
  );

// Held before `patchWebSocket` replaces the properties, so a test can prove the real call still runs.
const raw = {
  connect: nativeModule.connect,
  send: nativeModule.send,
  close: nativeModule.close,
};

/** Inbound events reach a `NativeEventEmitter` through this, so emitting here is what native does. */
const emit = (name: string, event: unknown) => DeviceEventEmitter.emit(name, event);

const SOCKET_ID = 7;
const socketOf = () => networkLogStore.getWebSocketSnapshot()[0];

describe('patchWebSocket', () => {
  beforeAll(() => {
    networkLogStore.setEnabled(true);
    patchWebSocket();
  });

  beforeEach(() => networkLogStore.clear());

  function connect() {
    nativeModule.connect('wss://example.test/socket', ['chat'], {}, SOCKET_ID);
  }

  it('records a connection as connecting, and passes the call through', () => {
    connect();

    expect(socketOf()).toMatchObject({
      kind: 'websocket',
      url: 'wss://example.test/socket',
      protocols: ['chat'],
      status: 'connecting',
      socketId: SOCKET_ID,
    });
    expect(raw.connect).toHaveBeenCalledWith('wss://example.test/socket', ['chat'], {}, SOCKET_ID);
  });

  it('marks it open when the native event arrives', () => {
    connect();
    emit('websocketOpen', { id: SOCKET_ID, protocol: 'chat' });

    expect(socketOf().status).toBe('open');
  });

  it('keeps messages in both directions, in order', () => {
    connect();
    nativeModule.send('hello', SOCKET_ID);
    emit('websocketMessage', { id: SOCKET_ID, type: 'text', data: 'hi back' });
    nativeModule.sendBinary('AAEC', SOCKET_ID);

    expect(networkLogStore.getWebSocketMessages(socketOf().id)).toMatchObject([
      { direction: 'sent', messageType: 'text', data: 'hello' },
      { direction: 'received', messageType: 'text', data: 'hi back' },
      { direction: 'sent', messageType: 'binary', data: 'AAEC' },
    ]);
    expect(raw.send).toHaveBeenCalledWith('hello', SOCKET_ID);
  });

  it('records a blob message as binary rather than dropping it', () => {
    connect();
    emit('websocketMessage', { id: SOCKET_ID, type: 'blob', data: { blobId: 'x', size: 3 } });

    expect(networkLogStore.getWebSocketMessages(socketOf().id)).toMatchObject([
      { direction: 'received', messageType: 'binary' },
    ]);
  });

  it('carries the close code and reason through', () => {
    connect();
    emit('websocketClosed', { id: SOCKET_ID, code: 1001, reason: 'going away' });

    expect(socketOf()).toMatchObject({
      status: 'closed',
      closeCode: 1001,
      closeReason: 'going away',
    });
  });

  it('records a failure with its message', () => {
    connect();
    emit('websocketFailed', { id: SOCKET_ID, message: 'handshake failed' });

    expect(socketOf()).toMatchObject({ status: 'error', error: 'handshake failed' });
  });

  it('handles the one-argument close, which carries no code', () => {
    connect();
    nativeModule.close(SOCKET_ID);

    expect(socketOf()).toMatchObject({ status: 'closing' });
    expect(socketOf().closeCode).toBeUndefined();
    expect(raw.close).toHaveBeenCalledWith(SOCKET_ID);
  });
});
