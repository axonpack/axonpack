import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EventStreamDemo } from './EventStreamDemo';
import { ExpoFetchDemo } from './ExpoFetchDemo';
import { NativeRequests } from './NativeRequests';
import { TabBar } from './TabBar';
import { WebSocketDemo } from './WebSocketDemo';
import { WebViewDemo } from './WebViewDemo';

const TABS = [
  { key: 'native' as const, label: 'Native' },
  { key: 'webview' as const, label: 'WebView' },
  { key: 'socket' as const, label: 'Socket' },
  { key: 'stream' as const, label: 'Stream' },
  { key: 'expo' as const, label: 'expo/fetch' },
];

export function RequestsScreen() {
  const [tab, setTab] = useState<'native' | 'webview' | 'socket' | 'stream' | 'expo'>('native');

  return (
    <View style={styles.container}>
      <TabBar tabs={TABS} activeKey={tab} onChange={setTab} variant="secondary" />
      {tab === 'native' ? <NativeRequests /> : null}
      {tab === 'webview' ? <WebViewDemo /> : null}
      {tab === 'socket' ? <WebSocketDemo /> : null}
      {tab === 'stream' ? <EventStreamDemo /> : null}
      {tab === 'expo' ? <ExpoFetchDemo /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
