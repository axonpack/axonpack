import { createMMKV, type MMKV } from "react-native-mmkv";

/**
 * The app's key-value store, which a tab reads by calling it.
 *
 * Nothing is bridged. A tab's component runs in the app, so it holds this instance and calls the
 * same synchronous methods the screen does. The panel only ever sees what the component drew.
 *
 * `createMMKV` throws when the native module is missing, which is every Expo Go session, so this is
 * `null` there and the screens say so rather than the app failing at import. Version 4 is a Nitro
 * module and a factory rather than a constructor, and its delete is `remove`.
 */
export const mmkv: MMKV | null = (() => {
  try {
    return createMMKV({ id: "devtools-tab-example" });
  } catch {
    return null;
  }
})();

export const MMKV_UNAVAILABLE =
  "MMKV needs a native build. Run `bun run ios` rather than Expo Go.";

/** Seeded once, so both the screen and the tab have something to look at. */
export function seedStorage(): void {
  if (!mmkv || mmkv.getString("user.email")) return;

  mmkv.set("user.email", "ada@example.com");
  mmkv.set("user.id", 42);
  mmkv.set("onboarding.done", true);
  mmkv.set("theme", "dark");
  mmkv.set("cart", JSON.stringify({ items: 3, total: 24.5 }));
}

/**
 * Every key with its value and how it is stored.
 *
 * MMKV has no type query, so the type is probed rather than asked for. Each check is against
 * `undefined` and never for truthiness: a stored `0` or `false` is a value, and treating it as a
 * miss would hide the key.
 */
export function readAll(): { key: string; value: string; kind: string }[] {
  if (!mmkv) return [];

  return mmkv.getAllKeys().map((key) => {
    const text = mmkv.getString(key);
    if (text !== undefined) return { key, value: text, kind: "string" };

    const number = mmkv.getNumber(key);
    if (number !== undefined)
      return { key, value: String(number), kind: "number" };

    const flag = mmkv.getBoolean(key);
    if (flag !== undefined)
      return { key, value: String(flag), kind: "boolean" };

    const buffer = mmkv.getBuffer(key);
    if (buffer !== undefined)
      return { key, value: `${buffer.byteLength} bytes`, kind: "buffer" };

    return { key, value: "", kind: "empty" };
  });
}
