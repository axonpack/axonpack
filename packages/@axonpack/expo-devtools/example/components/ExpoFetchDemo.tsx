import { fetch as expoFetch } from 'expo/fetch';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from './ActionButton';

const JSON_URL = 'https://jsonplaceholder.typicode.com/posts';
/** Chunked JSON, one blob per `n`, so a body arrives in pieces rather than all at once. */
const CHUNKED_URL = 'https://postman-echo.com/stream/5';
const EVENTS_URL = 'https://postman-echo.com/server-events/10';

/**
 * Expo installs its own native fetch and exports it from a module of its own, so there are two ways
 * to call the same implementation and the panel labels them apart: reading it off the global is
 * `fetch`, importing it from `expo/fetch` is `expo/fetch`. The second is the one a patch on the
 * global cannot see — `import { fetch } from 'expo/fetch'` never touches `globalThis` — which is why
 * it is worth a screen of its own.
 */
export function ExpoFetchDemo() {
  const [log, setLog] = useState<string[]>([]);

  const note = (line: string) => setLog((lines) => [line, ...lines].slice(0, 20));

  async function get() {
    try {
      const response = await expoFetch(`${JSON_URL}/1`);
      const text = await response.text();
      note(`expo/fetch GET ${response.status} · ${text.length} chars`);
    } catch (error) {
      note(`expo/fetch GET failed: ${message(error)}`);
    }
  }

  async function post() {
    try {
      const response = await expoFetch(JSON_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'bruin', body: 'expo/fetch example', userId: 1 }),
      });
      note(`expo/fetch POST ${response.status}`);
    } catch (error) {
      note(`expo/fetch POST failed: ${message(error)}`);
    }
  }

  async function getViaGlobal() {
    try {
      // The very same native implementation, reached the other way — so the row says `fetch`.
      const response = await globalThis.fetch(`${JSON_URL}/2`);
      note(`global fetch GET ${response.status}`);
    } catch (error) {
      note(`global fetch GET failed: ${message(error)}`);
    }
  }

  async function readChunked() {
    try {
      const response = await expoFetch(CHUNKED_URL);
      const reader = response.body?.getReader();
      if (!reader) return note('expo/fetch: no readable body on this runtime');

      let chunks = 0;
      let bytes = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks += 1;
        bytes += value?.byteLength ?? 0;
      }
      note(`expo/fetch streamed body: ${chunks} chunks, ${bytes} bytes`);
    } catch (error) {
      note(`expo/fetch stream failed: ${message(error)}`);
    }
  }

  async function readEvents() {
    try {
      const response = await expoFetch(EVENTS_URL, {
        headers: { Accept: 'text/event-stream' },
      });
      note(`expo/fetch event stream open: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) return note('expo/fetch: no readable body on this runtime');

      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true }).trim();
        if (chunk) note(`event: ${chunk.replace(/\n/g, ' · ').slice(0, 60)}`);
      }
      note('expo/fetch event stream ended');
    } catch (error) {
      note(`expo/fetch event stream stopped: ${message(error)}`);
    }
  }

  async function cancel() {
    const controller = new AbortController();
    // Aborted while it is still in flight, which is the only way to tell a cancelled row from a
    // failed one in the panel.
    setTimeout(() => controller.abort(), 20);
    try {
      await expoFetch(CHUNKED_URL, { signal: controller.signal });
      note('expo/fetch finished before the abort landed');
    } catch (error) {
      note(`expo/fetch cancelled: ${message(error)}`);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Expo fetch</Text>
      <Text style={styles.body}>
        Expo ships its own native fetch. Both buttons below call the same implementation, and the
        Network tab labels them by how they were called — open a row&apos;s Headers tab to see its
        Source, or filter by Source in the filter panel.
      </Text>

      <Text style={styles.sectionHeader}>Imported from expo/fetch</Text>
      <Text style={styles.expect}>Expect rows with source expo/fetch</Text>
      <ActionButton label="GET" onPress={get} />
      <ActionButton label="POST" onPress={post} />
      <ActionButton label="Read a chunked body" onPress={readChunked} />
      <ActionButton label="Read an event stream" onPress={readEvents} />
      <ActionButton label="Cancel mid-flight" onPress={cancel} />

      <Text style={styles.sectionHeader}>Read off the global</Text>
      <Text style={styles.expect}>Expect a row with source fetch</Text>
      <ActionButton label="GET" onPress={getViaGlobal} />

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

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
  sectionHeader: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  expect: {
    fontSize: 12,
    color: '#0a7ea4',
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
