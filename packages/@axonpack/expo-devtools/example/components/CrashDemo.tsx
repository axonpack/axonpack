import { DevtoolsErrorBoundary } from '@axonpack/expo-devtools';
import { requireOptionalNativeModule } from 'expo';
import { useState, useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from './ActionButton';
import { devtools } from '../devtools';

/**
 * The same optional module the package itself uses. Reached directly here only so the demo can crash
 * the native side on purpose — an app has no reason to call this.
 */
const nativeModule = requireOptionalNativeModule<{ crashMainThread: (message: string) => void }>(
  'AxonpackDevtools'
);

function ThrowingComponent(): React.ReactElement {
  throw new Error('render threw: this component has no business rendering');
}

/** A render error, which is the only tier that produces a component stack. */
function RenderErrorDemo() {
  const [broken, setBroken] = useState(false);

  return (
    <DevtoolsErrorBoundary
      fallback={(error, reset) => (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>Boundary caught: {error.message}</Text>
          <ActionButton
            label="Reset boundary"
            onPress={() => {
              setBroken(false);
              reset();
            }}
          />
        </View>
      )}>
      {broken ? (
        <ThrowingComponent />
      ) : (
        <ActionButton label="Throw during render" onPress={() => setBroken(true)} />
      )}
    </DevtoolsErrorBoundary>
  );
}

const ACTIONS: { title: string; note: string; items: { label: string; run: () => void }[] }[] = [
  {
    title: 'JavaScript errors',
    note: 'Caught by the ErrorUtils handler while the devtools are on. A non-fatal one leaves the app running and opens the sheet; a fatal one still ends the process.',
    items: [
      {
        label: 'Throw in a timer',
        run: () => {
          setTimeout(() => {
            throw new Error('async boom: nothing was awaiting this');
          }, 0);
        },
      },
      {
        label: 'Read of undefined',
        run: () => {
          setTimeout(() => {
            const value = undefined as unknown as { deeply: { nested: string } };
            console.log(value.deeply.nested);
          }, 0);
        },
      },
    ],
  },
  {
    title: 'Promise rejections',
    note: 'React Native only tracks these under __DEV__, so this tier is what a release build gains.',
    items: [
      {
        label: 'Reject with an Error',
        run: () => {
          Promise.reject(new Error('payment gateway timed out'));
        },
      },
      {
        label: 'Reject with an object',
        run: () => {
          Promise.reject({ code: 401, detail: 'token expired' });
        },
      },
      {
        label: 'Failed await',
        run: () => {
          void (async () => {
            await Promise.reject(new Error('await with nothing to catch it'));
          })();
        },
      },
    ],
  },
  {
    title: 'Native, and unrecoverable',
    note: 'The one tier keepAliveOnJsCrash cannot save: the process is already going down by the time we see it. Nothing appears now — reopen the app and the report is waiting.',
    items: [
      {
        label: 'Uncaught native exception',
        run: () => nativeModule?.crashMainThread('deliberate native crash from the example app'),
      },
    ],
  },
  {
    title: 'Context',
    note: 'Whatever you attach here rides along on every record captured afterwards.',
    items: [
      {
        label: 'Attach user context',
        run: () =>
          devtools.setCrashContext({
            userId: 'u_4471',
            screen: 'CrashDemo',
            featureFlags: ['new-checkout'],
          }),
      },
      { label: 'Clear context', run: () => devtools.setCrashContext(null) },
    ],
  },
];

export function CrashDemo() {
  const records = useSyncExternalStore(
    devtools.crashStore.subscribe,
    devtools.crashStore.getSnapshot
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Crash reporting</Text>
      <Text style={styles.intro}>
        Each button below produces one kind of crash record. The report sheet opens on capture;
        every record also stays in the Crashes tab behind the bug FAB, with copy and share actions.
      </Text>
      <Text style={styles.count}>
        {records.length} records · {records.filter((record) => !record.seen).length} unread
      </Text>

      {ACTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionHeader}>{section.title}</Text>
          <Text style={styles.sectionNote}>{section.note}</Text>
          <View style={styles.grid}>
            {section.items.map((item) => (
              <ActionButton key={item.label} label={item.label} onPress={item.run} />
            ))}
          </View>
        </View>
      ))}

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Render errors</Text>
        <Text style={styles.sectionNote}>
          DevtoolsErrorBoundary catches this one, so the record carries a component stack — the half
          ErrorUtils never sees — and the screen shows a fallback instead of going white.
        </Text>
        <RenderErrorDemo />
      </View>

      {nativeModule === null && (
        <Text style={styles.warning}>
          No native module here (Expo Go). Native exception capture and device details need a dev
          build — `bun run ios`.
        </Text>
      )}
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
    fontWeight: '700',
    color: '#11181c',
  },
  intro: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: '#5f6368',
  },
  count: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  section: {
    marginTop: 22,
    gap: 8,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#11181c',
  },
  sectionNote: {
    fontSize: 12,
    lineHeight: 17,
    color: '#5f6368',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fallback: {
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fce8e6',
  },
  fallbackText: {
    fontSize: 12,
    color: '#d93025',
  },
  warning: {
    marginTop: 24,
    fontSize: 12,
    lineHeight: 17,
    color: '#b26a00',
  },
});
