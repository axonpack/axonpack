import { DevtoolsOverlay } from '@axonpack/expo-devtools';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ConsoleDemo } from './components/ConsoleDemo';
import { RequestsScreen } from './components/RequestsScreen';
import { TabBar } from './components/TabBar';

const TABS = [
  { key: 'requests' as const, label: 'Requests' },
  { key: 'console' as const, label: 'Console' },
];

export default function App() {
  const [tab, setTab] = useState<'requests' | 'console'>('requests');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <TabBar tabs={TABS} activeKey={tab} onChange={setTab} />
        {tab === 'requests' ? <RequestsScreen /> : <ConsoleDemo />}
        <DevtoolsOverlay />
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
