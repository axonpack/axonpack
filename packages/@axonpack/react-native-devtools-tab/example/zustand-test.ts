import { create } from "zustand";

/**
 * A store from a library, to answer whether a tab can read one.
 *
 * The hand-rolled `session.ts` next to this proves a tab reaches the app's state; it proves it with
 * a store written for the purpose. This one is here because the question people actually ask is
 * about the store they already have, and zustand's hook is `useSyncExternalStore`, which a custom
 * renderer has to implement itself. It lives in the app, like any other module the app imports.
 */
export type ZustandTest = {
  count: number;
  theme: "light" | "dark";
  items: string[];
  increment: () => void;
  toggleTheme: () => void;
  addItem: () => void;
};

export const useZustandTest = create<ZustandTest>((set) => ({
  count: 0,
  theme: "dark",
  items: ["first"],

  increment: () => set((state) => ({ count: state.count + 1 })),

  toggleTheme: () =>
    set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),

  addItem: () =>
    set((state) => ({ items: [...state.items, `item ${state.items.length}`] })),
}));
