import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from './ActionButton';

/**
 * A public echo service, so a send comes straight back and both directions show up in the panel.
 * Anything typed here leaves the device — keep it to throwaway payloads.
 */
const ECHO_URL = 'wss://ws.postman-echo.com/raw';

export function WebSocketDemo() {
  const socketRef = useRef<WebSocket | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const note = (line: string) => setLog((lines) => [`${line}`, ...lines].slice(0, 20));

  function connect() {
    if (socketRef.current) return note('already connected');
    const socket = new WebSocket(ECHO_URL, ['chat']);
    socketRef.current = socket;
    socket.onopen = () => note('open');
    socket.onmessage = (event) => note(`received: ${String(event.data).slice(0, 60)}`);
    socket.onerror = () => note('error');
    socket.onclose = (event) => {
      note(`closed: ${event.code}`);
      socketRef.current = null;
    };
    note('connecting…');
  }

  function sendText() {
    if (!socketRef.current) return note('connect first');
    socketRef.current.send(`hello at ${new Date().toLocaleTimeString()}`);
    note('sent text');
  }

  function sendBinary() {
    if (!socketRef.current) return note('connect first');
    socketRef.current.send(new Uint8Array([1, 2, 3, 4]).buffer);
    note('sent binary');
  }

  function close() {
    if (!socketRef.current) return note('nothing open');
    socketRef.current.close(1000, 'demo done');
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>WebSocket</Text>
      <Text style={styles.body}>
        Open the devtools panel and look at the Network tab — the connection appears as a WS row,
        and opening it shows every message in both directions.
      </Text>
      <ActionButton label="Connect" onPress={connect} />
      <ActionButton label="Send text" onPress={sendText} />
      <ActionButton label="Send binary" onPress={sendBinary} />
      <ActionButton label="Close" onPress={close} />
      <View style={styles.log}>
        {log.map((line, index) => (
          <Text key={`${index}-${line}`} style={styles.logLine}>
            {line}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 10,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    fontSize: 13,
    color: '#555',
  },
  log: {
    marginTop: 8,
    gap: 2,
  },
  logLine: {
    fontSize: 11,
    color: '#666',
  },
});
