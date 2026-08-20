import { NativeEventEmitter, Platform, TurboModuleRegistry, type NativeModule } from 'react-native';
// Type-only, so nothing of this private path survives compilation into the bundle.
import type { TurboModule } from 'react-native/Libraries/TurboModule/RCTExport';

import { networkLogStore } from '../stores/network-log.store';

/**
 * Mirrors React Native's own `WebSocketModule` spec, which lives under a private path. Looked up by
 * name through the public `TurboModuleRegistry` instead of importing that spec, so this package
 * depends on nothing React Native does not expose.
 */
type NativeWebSocketModule = TurboModule &
  NativeModule & {
    connect(
      url: string,
      protocols: string[] | null,
      options: { headers?: Record<string, unknown> },
      socketId: number
    ): void;
    send(message: string, socketId: number): void;
    sendBinary(base64: string, socketId: number): void;
    close(...args: [code: number, reason: string, socketId: number] | [socketId: number]): void;
  };

type OpenEvent = { id: number; protocol: string };
type ClosedEvent = { id: number; code: number; reason: string };
type FailedEvent = { id: number; message: string };
type MessageEvent = { id: number; type: 'text' | 'binary' | 'blob'; data: unknown };

let isPatched = false;
let messageCounter = 0;

/** Native events are keyed by React Native's socket id, which it never reuses within a session. */
function entryId(socketId: number): string {
  return `ws-${socketId}`;
}

function nextMessageId(): string {
  messageCounter += 1;
  return `wsm-${messageCounter}`;
}

function recordMessage(
  socketId: number,
  direction: 'sent' | 'received',
  messageType: 'text' | 'binary',
  data: string
) {
  networkLogStore.addWebSocketMessage(entryId(socketId), {
    id: nextMessageId(),
    direction,
    data,
    messageType,
    timestamp: Date.now(),
  });
}

/** A close reported without a code is the one-argument form, which carries no reason either. */
function closeArgs(args: [number, string, number] | [number]): {
  socketId: number;
  code?: number;
  reason?: string;
} {
  if (args.length === 3) return { code: args[0], reason: args[1], socketId: args[2] };
  return { socketId: args[0] };
}

export function patchWebSocket() {
  if (isPatched) return;

  const nativeModule = TurboModuleRegistry.get<NativeWebSocketModule>('WebSocketModule');
  if (!nativeModule) return;

  isPatched = true;

  const originalConnect = nativeModule.connect;
  const originalSend = nativeModule.send;
  const originalSendBinary = nativeModule.sendBinary;
  const originalClose = nativeModule.close;

  // Outbound traffic is only visible by standing in front of the module; inbound arrives as events,
  // which needs no patch at all. React Native itself passes the module on iOS and `null` elsewhere.
  const emitter = new NativeEventEmitter(Platform.OS === 'ios' ? nativeModule : undefined);

  emitter.addListener('websocketOpen', ({ id }: OpenEvent) => {
    networkLogStore.updateWebSocket(entryId(id), { status: 'open' });
  });

  emitter.addListener('websocketMessage', ({ id, type, data }: MessageEvent) => {
    // A blob is relayed as an object describing bytes we cannot read back, so only its shape is kept.
    const isText = type === 'text';
    recordMessage(id, 'received', isText ? 'text' : 'binary', isText ? String(data) : '[binary]');
  });

  emitter.addListener('websocketClosed', ({ id, code, reason }: ClosedEvent) => {
    networkLogStore.updateWebSocket(entryId(id), {
      status: 'closed',
      closeCode: code,
      closeReason: reason,
    });
  });

  emitter.addListener('websocketFailed', ({ id, message }: FailedEvent) => {
    networkLogStore.updateWebSocket(entryId(id), { status: 'error', error: message });
  });

  nativeModule.connect = (url, protocols, options, socketId) => {
    networkLogStore.addWebSocket({
      id: entryId(socketId),
      socketId,
      url,
      method: 'WS',
      source: 'websocket',
      protocols: protocols ?? undefined,
      status: 'connecting',
      startedAt: Date.now(),
    });
    return originalConnect.call(nativeModule, url, protocols, options, socketId);
  };

  nativeModule.send = (message, socketId) => {
    recordMessage(socketId, 'sent', 'text', message);
    return originalSend.call(nativeModule, message, socketId);
  };

  nativeModule.sendBinary = (base64, socketId) => {
    recordMessage(socketId, 'sent', 'binary', base64);
    return originalSendBinary.call(nativeModule, base64, socketId);
  };

  nativeModule.close = (...args: [number, string, number] | [number]) => {
    const { socketId, code, reason } = closeArgs(args);
    networkLogStore.updateWebSocket(entryId(socketId), {
      status: 'closing',
      closeCode: code,
      closeReason: reason,
    });
    return (originalClose as (...a: typeof args) => void).call(nativeModule, ...args);
  };
}
