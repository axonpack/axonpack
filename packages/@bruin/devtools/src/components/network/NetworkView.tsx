import { useSyncExternalStore } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { networkLogStore } from '../../utils/network/networkLogStore';
import type { NetworkLogEntry } from '../../utils/network/networkLogStore';

const STATUS_COLORS: Record<NetworkLogEntry['status'], string> = {
  pending: '#999999',
  success: '#2e7d32',
  error: '#c62828',
};

function LogRow({ entry }: { entry: NetworkLogEntry }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.method}>{entry.method}</Text>
        <Text style={[styles.status, { color: STATUS_COLORS[entry.status] }]}>
          {entry.status === 'pending' ? '...' : (entry.statusCode ?? entry.error ?? '')}
        </Text>
        {entry.duration !== undefined && <Text style={styles.duration}>{entry.duration}ms</Text>}
      </View>
      <Text style={styles.url} numberOfLines={1}>
        {entry.url}
      </Text>
      {entry.source && <Text style={styles.source}>{entry.source}</Text>}
    </View>
  );
}

export function NetworkView() {
  const logs = useSyncExternalStore(networkLogStore.subscribe, networkLogStore.getSnapshot);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Network ({logs.length})</Text>
        <TouchableOpacity onPress={networkLogStore.clear}>
          <Text style={styles.clear}>Clear</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={logs}
        keyExtractor={(entry) => entry.id}
        renderItem={({ item }) => <LogRow entry={item} />}
        ListEmptyComponent={<Text style={styles.empty}>No requests captured yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  clear: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
  row: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  method: {
    fontWeight: '700',
    fontSize: 12,
    minWidth: 44,
  },
  status: {
    fontWeight: '700',
    fontSize: 12,
  },
  duration: {
    fontSize: 11,
    color: '#888',
    marginLeft: 'auto',
  },
  url: {
    fontSize: 12,
    color: '#333',
    marginTop: 2,
  },
  source: {
    fontSize: 10,
    color: '#0a7ea4',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
});
