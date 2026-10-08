import { QueryClientProvider, useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from './ActionButton';
import { queryClient } from '../devtools';

const BASE_URL = 'https://jsonplaceholder.typicode.com';

async function getJson(path: string) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${path}`);
  return response.json();
}

/**
 * Prints every field a forced state touches, so each button in the panel's Query tab visibly
 * changes this card: Loading blanks the data, Error fills the error line, Reset and Remove refetch.
 */
function QueryCard({
  title,
  queryKey,
  path,
}: {
  title: string;
  queryKey: unknown[];
  path: string;
}) {
  const { status, fetchStatus, isLoading, data, error, refetch } = useQuery({
    queryKey,
    queryFn: () => getJson(path),
    retry: false,
  });

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.meta}>
        {status} · {fetchStatus}
        {isLoading ? ' · loading…' : ''}
      </Text>
      {error ? <Text style={styles.error}>{error.message}</Text> : null}
      <Text style={styles.data} numberOfLines={4}>
        {data === undefined ? 'No data' : JSON.stringify(data)}
      </Text>
      <ActionButton label="Refetch from the app" onPress={() => refetch()} />
    </View>
  );
}

function QueryScreen() {
  const [todoId, setTodoId] = useState(1);
  const createPost = useMutation({
    mutationKey: ['create-post'],
    mutationFn: (title: string) =>
      fetch(`${BASE_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, userId: 1 }),
      }).then((response) => response.json()),
  });

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.hint}>
        Open the panel's Query tab, tap a query, and use its buttons. The card for that query
        changes as you press them.
      </Text>

      <QueryCard title="Todo" queryKey={['todo', todoId]} path={`/todos/${todoId}`} />
      <View style={styles.row}>
        <ActionButton label="Next todo" onPress={() => setTodoId((id) => id + 1)} />
      </View>

      <QueryCard title="User" queryKey={['user', 1]} path="/users/1" />
      <QueryCard title="Always fails" queryKey={['missing']} path="/does-not-exist" />

      <Text style={styles.heading}>Mutation</Text>
      <View style={styles.row}>
        <ActionButton
          label="Create post"
          onPress={() => createPost.mutate(`Post at ${new Date().toLocaleTimeString()}`)}
        />
      </View>
      <Text style={styles.meta}>
        {createPost.status}
        {createPost.data ? ` · id ${createPost.data.id}` : ''}
      </Text>
    </ScrollView>
  );
}

export function QueryDemo() {
  return (
    <QueryClientProvider client={queryClient}>
      <QueryScreen />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 8,
  },
  heading: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#11181c',
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    color: '#687076',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    gap: 6,
    padding: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d0d7de',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#11181c',
  },
  meta: {
    fontSize: 12,
    color: '#687076',
  },
  error: {
    fontSize: 12,
    color: '#d93025',
  },
  data: {
    fontSize: 12,
    color: '#11181c',
  },
});
