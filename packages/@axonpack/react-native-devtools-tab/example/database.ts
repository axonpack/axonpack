import * as SQLite from "expo-sqlite";

/**
 * The app's database, which a tab queries by querying it.
 *
 * Same story as `storage.ts`: a tab runs in the app, so it holds this handle and runs SQL against
 * the real file on the device. Nothing is copied to the panel but the rows a component rendered.
 *
 * Opened synchronously so a tab can query it on its first render without waiting for anything.
 */
export const db = SQLite.openDatabaseSync("devtools-tab-example.db");

export type Task = { id: number; title: string; done: number; created: string };

/** Created and seeded once, so a tab opened on a fresh install still has rows to show. */
export function seedDatabase(): void {
  db.execSync(`
    create table if not exists tasks (
      id integer primary key not null,
      title text not null,
      done integer not null default 0,
      created text not null default current_timestamp
    );
  `);

  const { count } = db.getFirstSync<{ count: number }>(
    "select count(*) as count from tasks",
  ) ?? { count: 0 };

  if (count > 0) return;

  for (const title of [
    "Open React Native DevTools",
    "Press a row in the Database tab",
    "Watch the screen follow",
  ])
    db.runSync("insert into tasks (title) values (?)", title);
}

export function allTasks(): Task[] {
  return db.getAllSync<Task>("select * from tasks order by id");
}

export function toggleTask(id: number): void {
  db.runSync(
    "update tasks set done = case done when 1 then 0 else 1 end where id = ?",
    id,
  );
}

export function addTask(title: string): void {
  db.runSync("insert into tasks (title) values (?)", title);
}

export function clearDone(): void {
  db.runSync("delete from tasks where done = 1");
}
