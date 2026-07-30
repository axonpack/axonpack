import { NetworkView } from '@bruin/devtools';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { RequestsScreen } from './components/RequestsScreen';
import { TabBar } from './components/TabBar';

const TABS = [
  { key: 'requests' as const, label: 'Requests' },
  { key: 'network' as const, label: 'Network' },
];

export default function App() {
  const [tab, setTab] = useState<'requests' | 'network'>('requests');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <TabBar tabs={TABS} activeKey={tab} onChange={setTab} variant="primary" />
        {tab === 'requests' ? <RequestsScreen /> : <NetworkView />}
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
