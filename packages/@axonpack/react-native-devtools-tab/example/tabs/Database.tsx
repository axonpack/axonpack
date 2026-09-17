import { useReducer, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { addTask, allTasks, clearDone, db, toggleTask } from "../database";

/**
 * The app's SQLite database, queried from the panel, drawn with React Native components.
 *
 * The query runs on the device against the real file, because this component runs in the app. The
 * panel is sent the rows this rendered and nothing else: no database, no driver, no copy of either.
 */
export default function Database() {
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const [title, setTitle] = useState("");
  const [round, clear] = useReducer((n: number) => n + 1, 0);
  const [sql, setSql] = useState("select * from tasks order by id desc");
  const [result, setResult] = useState("");

  const tasks = allTasks();

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.heading}>{tasks.length} rows in tasks</Text>

      <View style={styles.table}>
        {tasks.map((task) => (
          <Pressable
            key={task.id}
            style={styles.row}
            onPress={() => {
              toggleTask(task.id);
              refresh();
            }}
          >
            <Text style={styles.id}>{task.id}</Text>
            <Text style={[styles.title, task.done ? styles.done : null]}>
              {task.title}
            </Text>
            <Text style={styles.state}>{task.done ? "done" : "open"}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.form}>
        {/* Uncontrolled, because a controlled TextInput talks to a native view a tab does not have. */}
        <TextInput
          key={`title-${round}`}
          style={styles.input}
          value={title}
          placeholder="a new task"
          placeholderTextColor="#6b7280"
          onChangeText={setTitle}
        />
        <Pressable
          style={styles.button}
          onPress={() => {
            if (!title) return;
            addTask(title);
            setTitle("");
            clear();
            refresh();
          }}
        >
          <Text style={styles.buttonText}>add</Text>
        </Pressable>
        <Pressable
          style={styles.button}
          onPress={() => {
            clearDone();
            refresh();
          }}
        >
          <Text style={styles.buttonText}>clear done</Text>
        </Pressable>
      </View>

      <TextInput
        style={[styles.input, styles.sql]}
        value={sql}
        multiline
        onChangeText={setSql}
      />

      <Pressable
        style={styles.button}
        onPress={() => {
          try {
            setResult(JSON.stringify(db.getAllSync(sql), null, 2));
          } catch (error) {
            // An error from SQLite is a normal answer here, so it is shown rather than thrown.
            setResult(String(error));
          }
        }}
      >
        <Text style={styles.buttonText}>run</Text>
      </Pressable>

      {result ? <Text style={styles.result}>{result}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 12, gap: 10 },
  heading: { fontSize: 13, fontWeight: "600" },
  table: { gap: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  id: { width: 24, fontSize: 11, opacity: 0.6 },
  title: { flex: 1, fontSize: 12 },
  done: { textDecorationLine: "line-through", opacity: 0.5 },
  state: { width: 44, fontSize: 11, opacity: 0.6 },
  form: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  input: {
    minWidth: 160,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#3c3c3c",
    borderRadius: 4,
  },
  sql: { minHeight: 44 },
  button: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: "#2b3040",
  },
  buttonText: { color: "#f2f4f8", fontSize: 12 },
  result: { fontSize: 11, fontFamily: "Courier" },
});
