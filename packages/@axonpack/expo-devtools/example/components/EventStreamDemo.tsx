import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from './ActionButton';

/**
 * The same public echo service the WebSocket demo uses, which streams one event a second and then
 * closes on its own — so a row can be watched counting up and then ending, without a server of ours.
 * Its events carry named types (`notification`, `info`, `message`) and an `id`, which is what the
 * event rows in the panel show. Requests leave the device — keep it to throwaway payloads.
 */
const STREAM_URL = 'https://postman-echo.com/server-events/20';

/**
 * Neither button uses an SSE client library, and that is the point: the devtools read
 * `text/event-stream` off the two transports every client is built on, so a stream shows up whether
 * the app opened it with `react-native-sse`, a raw XHR, or a streaming `fetch`.
 */
export function EventStreamDemo() {
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const note = (line: string) => setLog((lines) => [line, ...lines].slice(0, 20));

  function openWithXhr() {
    if (xhrRef.current) return note('xhr stream already open');
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    let read = 0;

    xhr.open('GET', STREAM_URL);
    xhr.setRequestHeader('Accept', 'text/event-stream');
    // React Native only delivers a growing `responseText` while something is listening here, which
    // is how an SSE client reads a stream off an XHR in the first place.
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 3) return;
      const chunk = xhr.responseText.slice(read);
      read = xhr.responseText.length;
      if (chunk.trim()) note(`xhr: ${chunk.trim().slice(0, 60)}`);
    };
    // Said out loud rather than left silent: a stream that never opens looks exactly like one that
    // opened and sent nothing, and the difference is usually the URL or the network.
    // Each of these releases the handle as well as reporting: this stream ends on its own, and a ref
    // left set would refuse to open the next one.
    const finish = (line: string) => {
      xhrRef.current = null;
      note(line);
    };
    xhr.onerror = () => finish('xhr stream failed — no response');
    xhr.onabort = () => finish('xhr stream closed');
    xhr.onload = () => finish('xhr stream ended');
    xhr.send();
    note('xhr stream opening…');
  }

  async function openWithFetch() {
    if (abortRef.current) return note('fetch stream already open');
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(STREAM_URL, {
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      });
      note(`fetch stream open: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) return note('fetch: no readable body on this runtime');

      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true }).trim();
        if (chunk) note(`fetch: ${chunk.slice(0, 60)}`);
      }
      note('fetch stream ended');
    } catch (error) {
      // The message matters here: an aborted stream and an unreachable host both land in this catch.
      note(`fetch stream stopped: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      abortRef.current = null;
    }
  }

  function closeAll() {
    if (!xhrRef.current && !abortRef.current) return note('nothing open');
    xhrRef.current?.abort();
    xhrRef.current = null;
    abortRef.current?.abort();
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Event streams</Text>
      <Text style={styles.body}>
        Open the devtools panel and look at the Network tab — a stream row reads STREAM while it is
        open and counts its events, and opening it shows every event with its type and data. This
        one sends twenty events, one a second, then ends by itself.
      </Text>
      <ActionButton label="Open with XMLHttpRequest" onPress={openWithXhr} />
      <ActionButton label="Open with fetch" onPress={openWithFetch} />
      <ActionButton label="Close both" onPress={closeAll} />
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
