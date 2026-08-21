import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from './ActionButton';

const BASE_URL = 'https://jsonplaceholder.typicode.com';

type NitroLibrary = {
  fetch: (url: string, init?: RequestInit) => Promise<{ status: number }>;
  NetworkInspector: { isEnabled: () => boolean; getEntries: () => readonly unknown[] };
};

/**
 * Loaded inside a try/catch, exactly as `devtools.ts` loads MMKV and for the same reason: this library
 * builds its JSI object at module scope, so a plain import throws where the native module is missing —
 * in Expo Go, that is the whole app failing to start rather than one screen going quiet.
 */
function loadNitro(): NitroLibrary | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-nitro-fetch') as NitroLibrary;
  } catch {
    return null;
  }
}

const nitro = loadNitro();

/**
 * A JSI HTTP client, and the reason this screen exists: its requests reach neither `globalThis.fetch`
 * nor `XMLHttpRequest` nor React Native's networking, so every patch in the panel is blind to them.
 * They show up anyway, because the library keeps its own record and the panel reads it — look for
 * `nitro-fetch` in the Source filter.
 */
export function NitroFetchDemo() {
  const [log, setLog] = useState<string[]>([]);

  const note = (line: string) => setLog((lines) => [line, ...lines].slice(0, 20));

  if (!nitro) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>nitro-fetch</Text>
        <Text style={styles.body}>
          This client is a JSI module, so it needs a native build — `bun run ios` or `bun run
          android`. Under Expo Go it is simply absent, which is what the panel reports too.
        </Text>
      </ScrollView>
    );
  }

  const { fetch: nitroFetch, NetworkInspector } = nitro;

  async function get() {
    try {
      const response = await nitroFetch(`${BASE_URL}/posts/1`);
      note(`GET ${response.status}`);
    } catch (error) {
      note(`GET failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function post() {
    try {
      const response = await nitroFetch(`${BASE_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'bruin', body: 'via nitro', userId: 1 }),
      });
      note(`POST ${response.status}`);
    } catch (error) {
      note(`POST failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function failing() {
    try {
      await nitroFetch('https://nowhere.invalid/thing');
      note('unexpectedly succeeded');
    } catch (error) {
      note(`failed as expected: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>nitro-fetch</Text>
      <Text style={styles.body}>
        A JSI client no patch can see. The panel reads the record this library keeps of itself, so
        these rows arrive complete — with a source of nitro-fetch, and no progress, because the
        library reports a request once it is done.
      </Text>
      <ActionButton label="GET" onPress={get} />
      <ActionButton label="POST" onPress={post} />
      <ActionButton label="A request that fails" onPress={failing} />
      <Text style={styles.body}>
        Inspector enabled: {String(NetworkInspector.isEnabled())} · entries recorded:{' '}
        {NetworkInspector.getEntries().length}
      </Text>
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
