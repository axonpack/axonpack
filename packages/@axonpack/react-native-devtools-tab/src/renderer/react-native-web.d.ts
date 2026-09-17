/**
 * react-native-web ships no types of its own, and `@types/react-native-web` does not exist. Only the
 * components this page renders are declared, next to the only file that renders them, the same way
 * `device/react-reconciler.d.ts` declares what that file calls.
 *
 * They are all `ComponentType<Record<string, unknown>>` on purpose: the props are whatever React
 * Native handed the host element, and nothing here reads them.
 */
declare module "react-native-web" {
  import type { ComponentType } from "react";

  type Native = ComponentType<Record<string, unknown>>;

  export const View: Native;
  export const Text: Native;
  export const Image: Native;
  export const ScrollView: Native;
  export const TextInput: Native;
  export const Switch: Native;
}
