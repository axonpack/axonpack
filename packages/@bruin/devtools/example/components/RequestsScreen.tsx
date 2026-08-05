import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { NativeRequests } from './NativeRequests';
import { TabBar } from './TabBar';
import { WebViewDemo } from './WebViewDemo';

const TABS = [
  { key: 'native' as const, label: 'Native' },
  { key: 'webview' as const, label: 'WebView' },
];

export function RequestsScreen() {
  const [tab, setTab] = useState<'native' | 'webview'>('native');

  return (
    <View style={styles.container}>
      <TabBar tabs={TABS} activeKey={tab} onChange={setTab} variant="secondary" />
      {tab === 'native' ? <NativeRequests /> : <WebViewDemo />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
