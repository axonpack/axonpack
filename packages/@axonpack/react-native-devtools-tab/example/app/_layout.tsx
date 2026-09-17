import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { seedDatabase } from "../database";
import { seedStorage } from "../storage";

// Pulled in for its side effect: it calls `registerTab`, and doing it here means that happens as the
// app starts, before anything opens DevTools. Registering later works too, the frontend is told
// either way, but a tab that exists from the start is one less thing to explain.
//
// A require rather than an import because Metro folds `__DEV__` away before it collects
// dependencies, so this way a release bundle does not carry the tabs at all. Registering unguarded
// is safe either way, since a release build has no debugger to connect to.
if (__DEV__) require("../devtools");

/**
 * The app's one layout.
 *
 * The seeds run at module scope rather than in an effect, so a tab opened before the first screen
 * paints already has rows and keys to show.
 */
seedStorage();
seedDatabase();

export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#12141a" },
          headerTintColor: "#f2f4f8",
          contentStyle: { backgroundColor: "#12141a" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Devtools tab" }} />
        <Stack.Screen name="storage" options={{ title: "MMKV" }} />
        <Stack.Screen name="database" options={{ title: "SQLite" }} />
      </Stack>
    </>
  );
}
