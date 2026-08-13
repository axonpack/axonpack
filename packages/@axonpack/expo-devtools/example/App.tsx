import { DevtoolsOverlay } from '@axonpack/expo-devtools';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ConsoleDemo } from './components/ConsoleDemo';
import { PerformanceDemo } from './components/PerformanceDemo';
import { RequestsScreen } from './components/RequestsScreen';
import { TabBar } from './components/TabBar';

const TABS = [
  { key: 'requests' as const, label: 'Requests' },
  { key: 'console' as const, label: 'Console' },
  { key: 'performance' as const, label: 'Performance' },
];

export default function App() {
  const [tab, setTab] = useState<'requests' | 'console' | 'performance'>('requests');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <TabBar tabs={TABS} activeKey={tab} onChange={setTab} />
        {tab === 'requests' ? <RequestsScreen /> : null}
        {tab === 'console' ? <ConsoleDemo /> : null}
        {tab === 'performance' ? <PerformanceDemo /> : null}
        <DevtoolsOverlay size={52} color="#ffffff" iconColor="#1a73e8" />
        <StatusBar style="auto" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
