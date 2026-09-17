import { useReducer } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { addTask, allTasks, clearDone, toggleTask } from "../database";

/**
 * The app's half of the SQLite demo.
 *
 * The Database tab runs the same queries against the same file. Add a row here and the tab shows
 * it, because both are this app talking to its own database.
 */
export default function DatabaseScreen() {
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const tasks = allTasks();

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.hint}>
        {tasks.length} rows in `tasks`. The Database tab queries this file
        directly, on the device, and is sent only the rows it drew.
      </Text>

      {tasks.map((task) => (
        <Pressable
          key={task.id}
          onPress={() => {
            toggleTask(task.id);
            refresh();
          }}
        >
          <Text style={[styles.line, task.done ? styles.done : null]}>
            {task.id}. {task.title}
          </Text>
        </Pressable>
      ))}

      <Pressable
        style={styles.button}
        onPress={() => {
          addTask(`Added at ${new Date().toLocaleTimeString()}`);
          refresh();
        }}
      >
        <Text style={styles.buttonText}>Add a row, watch the tab</Text>
      </Pressable>

      <Pressable
        style={styles.button}
        onPress={() => {
          clearDone();
          refresh();
        }}
      >
        <Text style={styles.buttonText}>Clear the done ones</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 20, gap: 10 },
  hint: { color: "#8b93a5", fontSize: 13, lineHeight: 18 },
  line: { color: "#c8cfdd", fontSize: 13, paddingVertical: 4 },
  done: { textDecorationLine: "line-through", opacity: 0.5 },
  button: { backgroundColor: "#2b3040", borderRadius: 8, padding: 12 },
  buttonText: { color: "#f2f4f8", fontSize: 13, textAlign: "center" },
});
