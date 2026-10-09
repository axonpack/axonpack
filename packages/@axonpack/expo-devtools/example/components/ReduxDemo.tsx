import { devtoolsReduxEnhancer } from '@axonpack/expo-devtools';
import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { useState, useSyncExternalStore } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from './ActionButton';

const counter = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    add: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
    reset: () => ({ value: 0 }),
  },
});

type Todo = { id: number; title: string; done: boolean };

const todos = createSlice({
  name: 'todos',
  initialState: [] as Todo[],
  reducers: {
    added: (state, action: PayloadAction<string>) => {
      state.push({ id: state.length + 1, title: action.payload, done: false });
    },
    toggled: (state, action: PayloadAction<number>) => {
      const todo = state.find((item) => item.id === action.payload);
      if (todo) todo.done = !todo.done;
    },
    cleared: () => [],
  },
});

const clock = createSlice({
  name: 'clock',
  initialState: { ticks: 0 },
  reducers: {
    tick: (state) => {
      state.ticks += 1;
    },
  },
});

// A reducer that ignores everything: `analytics/*` actions change no state, and the config denies
// them, so they never show up in the tab.
function analytics(state: { enabled: boolean } = { enabled: true }) {
  return state;
}

/**
 * Created at import, before the provider starts, the way a real app's store is. The enhancer goes
 * after the default ones, so it sits inside the thunk middleware and records what a thunk dispatches.
 */
export const store = configureStore({
  reducer: {
    counter: counter.reducer,
    todos: todos.reducer,
    clock: clock.reducer,
    analytics,
  },
  enhancers: (getDefaultEnhancers) => getDefaultEnhancers().concat(devtoolsReduxEnhancer()),
});

function loadTodoLater() {
  return async (dispatch: typeof store.dispatch) => {
    dispatch({ type: 'todos/loading' });
    await new Promise((resolve) => setTimeout(resolve, 500));
    dispatch(todos.actions.added('Fetched by a thunk'));
  };
}

let ticker: ReturnType<typeof setInterval> | null = null;

export function ReduxDemo() {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const [ticking, setTicking] = useState(ticker !== null);

  function toggleTicker() {
    if (ticker) {
      clearInterval(ticker);
      ticker = null;
    } else {
      ticker = setInterval(() => store.dispatch(clock.actions.tick()), 50);
    }
    setTicking(ticker !== null);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Redux</Text>
      <Text style={styles.intro}>
        A Redux Toolkit store with the devtools enhancer. Tap below, then open the Redux tab: open a
        row for its diff, or dispatch your own from the toolbar, e.g.{' '}
        {'{ "type": "counter/add", "payload": 10 }'}.
      </Text>
      <Text style={styles.state}>{JSON.stringify(state)}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Counter</Text>
        <View style={styles.grid}>
          <ActionButton
            label="Increment"
            onPress={() => store.dispatch(counter.actions.increment())}
          />
          <ActionButton label="Add 5" onPress={() => store.dispatch(counter.actions.add(5))} />
          <ActionButton label="Reset" onPress={() => store.dispatch(counter.actions.reset())} />
          <ActionButton
            label="No-op action"
            onPress={() => store.dispatch({ type: 'counter/unknown' })}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Todos</Text>
        <Text style={styles.sectionNote}>Nested changes, so the diff has paths to show.</Text>
        <View style={styles.grid}>
          <ActionButton
            label="Add todo"
            onPress={() => store.dispatch(todos.actions.added(`Todo ${state.todos.length + 1}`))}
          />
          <ActionButton
            label="Toggle #1"
            onPress={() => store.dispatch(todos.actions.toggled(1))}
          />
          <ActionButton label="Clear" onPress={() => store.dispatch(todos.actions.cleared())} />
          <ActionButton label="Thunk (500ms)" onPress={() => store.dispatch(loadTodoLater())} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Noise</Text>
        <Text style={styles.sectionNote}>
          The ticker fires `clock/tick` 20 times a second. Open one in the tab and stop recording
          its type. `analytics/*` is denied in the config, so those never appear.
        </Text>
        <View style={styles.grid}>
          <ActionButton label={ticking ? 'Stop ticker' : 'Start ticker'} onPress={toggleTicker} />
          <ActionButton
            label="Track event"
            onPress={() => store.dispatch({ type: 'analytics/track', event: 'button' })}
          />
        </View>
      </View>
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
  state: {
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
    marginTop: 8,
  },
});
