import { useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from './ActionButton';
import { devtools } from '../devtools';

// A plain string rather than JSX text — the quotes and `=>` would otherwise need HTML entities.
const PROMPT_HINT =
  "At the > prompt, try: appInfo · double(21) · $modules('components') · " +
  "fetch('https://jsonplaceholder.typicode.com/todos/1').then(r => r.json())";

class Session {
  id = 'sess_8f21';
  user = { id: 7, name: 'ada', roles: ['admin', 'billing'] };
  startedAt = new Date('2026-08-06T09:30:00.000Z');
}

function buildCircular() {
  const root: Record<string, unknown> = { id: 'root', children: [] };
  (root.children as unknown[]).push({ id: 'child', parent: root });
  return root;
}

/** Nine levels deep — past the snapshot's depth cap, so the tail renders as `[Object]`. */
function buildDeeplyNested() {
  return { l1: { l2: { l3: { l4: { l5: { l6: { l7: { l8: { l9: 'past the cap' } } } } } } } } };
}

/** Reading `boom` throws — the formatter must drop the entry, not take the app down with it. */
function buildExplosive() {
  const value = { safe: 'this key reads fine' };
  Object.defineProperty(value, 'boom', {
    enumerable: true,
    get() {
      throw new Error('getter exploded');
    },
  });
  return value;
}

const ACTIONS: { title: string; note?: string; items: { label: string; run: () => void }[] }[] = [
  {
    title: 'Levels',
    note: 'One row per level — check the icon, the row tint, and the toolbar warn/error counts.',
    items: [
      { label: 'log', run: () => console.log('plain log message') },
      { label: 'info', run: () => console.info('informational message') },
      { label: 'warn', run: () => console.warn('something looks off') },
      { label: 'error', run: () => console.error('something actually broke') },
      { label: 'debug', run: () => console.debug('verbose debug message') },
    ],
  },
  {
    title: 'Argument shapes',
    note: 'How `formatConsoleArgs` serializes each kind of value into the row.',
    items: [
      {
        label: 'Mixed args',
        run: () => console.log('user', 42, true, null, undefined, 'end'),
      },
      {
        label: 'Nested object',
        run: () =>
          console.log('checkout', {
            orderId: 'ord_1201',
            total: 48.5,
            items: [{ sku: 'A-1', qty: 2 }],
            paid: false,
          }),
      },
      {
        label: 'Array of objects',
        run: () =>
          console.log([
            { id: 1, name: 'ada' },
            { id: 2, name: 'grace' },
          ]),
      },
      { label: 'Class instance', run: () => console.log('session', new Session()) },
      {
        label: 'Map & Set',
        run: () =>
          console.log(
            new Map([
              ['retries', 2],
              ['timeout', 30],
            ]),
            new Set(['read', 'write'])
          ),
      },
      {
        label: 'Exotic primitives',
        run: () =>
          console.log(
            function handler() {},
            Symbol('token'),
            9007199254740993n,
            new Date('2026-01-01T00:00:00.000Z'),
            /^bruin-\d+$/i
          ),
      },
      { label: 'Empty values', run: () => console.log({}, [], '', 0, NaN, Infinity) },
    ],
  },
  {
    title: 'Edge cases',
    note: 'The cases most likely to break a naive formatter.',
    items: [
      { label: 'Circular ref', run: () => console.log('circular', buildCircular()) },
      { label: 'Depth cap', run: () => console.log('deep', buildDeeplyNested()) },
      {
        label: 'Error + stack',
        run: () => console.error(new Error('checkout failed: gateway timeout')),
      },
      {
        label: 'Error as 2nd arg',
        run: () => console.error('failed to load user', new Error('HTTP 404')),
      },
      {
        label: 'Long message',
        run: () =>
          console.log(
            Array.from(
              { length: 12 },
              (_, index) => `line ${index + 1}: collapsed to four lines until you tap the row`
            ).join('\n')
          ),
      },
      {
        label: 'Repeat ×5',
        run: () => {
          for (let index = 0; index < 5; index += 1) {
            console.log('same message, logged five times in a row');
          }
        },
      },
      {
        label: 'Flood 600',
        run: () => {
          for (let index = 0; index < 600; index += 1) {
            console.log(`flood entry #${index}`, { index, squared: index * index });
          }
        },
      },
      {
        label: 'Throwing getter',
        run: () => {
          // The devtools patch swallows its own formatter error, but the *original* console can
          // still throw on the same value — so the demo guards the call itself.
          try {
            console.log('object with a throwing getter', buildExplosive());
          } catch (error) {
            console.warn('the original console.log threw:', (error as Error).message);
          }
        },
      },
      {
        label: 'Unhandled rejection',
        run: () => {
          Promise.reject(new Error('unhandled rejection from the console demo'));
        },
      },
    ],
  },
  {
    title: 'Known gaps',
    note: 'Expected to look wrong — these are the documented limits, not bugs to report.',
    items: [
      {
        label: 'printf specifiers',
        run: () => console.log('%s scored %d points', 'ada', 42),
      },
      {
        label: 'group / groupEnd',
        run: () => {
          console.group('a group');
          console.log('nested message');
          console.groupEnd();
        },
      },
      { label: 'count', run: () => console.count('taps') },
      { label: 'table', run: () => console.table([{ id: 1, name: 'ada' }]) },
      { label: 'clear', run: () => console.clear() },
    ],
  },
];

export function ConsoleDemo() {
  const entries = useSyncExternalStore(
    devtools.consoleLogStore.subscribe,
    devtools.consoleLogStore.getSnapshot
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Console capture</Text>
      <Text style={styles.intro}>
        Tap anything below, then open the bug FAB and switch to the Console tab. Every call also
        reaches Metro as usual.
      </Text>
      <Text style={styles.intro}>{PROMPT_HINT}</Text>
      <Text style={styles.count}>{entries.length} entries in the store</Text>

      {ACTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionHeader}>{section.title}</Text>
          {section.note && <Text style={styles.sectionNote}>{section.note}</Text>}
          <View style={styles.grid}>
            {section.items.map((item) => (
              <ActionButton key={item.label} label={item.label} onPress={item.run} />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  intro: {
    marginTop: 8,
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
  },
  count: {
    marginTop: 8,
    marginBottom: 20,
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#0a7ea4',
    textAlign: 'center',
  },
  section: {
    marginBottom: 22,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  sectionNote: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 12,
    color: '#888',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
