import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import "../devtools";
import { seedDatabase } from "../database";
import { seedStorage } from "../storage";

/**
 * The app's one layout, and where the tabs are registered.
 *
 * `../devtools` is imported for its side effect: it calls `registerTab`, and importing it here means
 * that happens as the app starts, before anything opens DevTools. Registering later works too, the
 * frontend is told either way, but a tab that exists from the start is one less thing to explain.
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
