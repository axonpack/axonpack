import { LogBox } from 'react-native';

/**
 * Turns React Native's own error UI off, for apps that would rather read a crash in this package's
 * report sheet than in a red box.
 *
 * `uninstall()` rather than `ignoreAllLogs()`: the latter only silences the toast notifications —
 * React Native's own comment on it says "uncaught errors will still open a full screen LogBox".
 * `uninstall()` clears the `isInstalled` flag that gates `addException`, `addLog` and
 * `addConsoleLog`, which is what actually stops the red box, and restores the original
 * `console.warn`.
 *
 * Warnings go with it. That is the deal being made — LogBox is one component, and the yellow toasts
 * cannot be kept without the red box. They are still captured by the Console tab.
 *
 * A no-op in a release build: `LogBox` is already a stub of empty methods outside `__DEV__`, so this
 * is safe to call unconditionally.
 */
export function disableDefaultLogBox() {
  try {
    LogBox.uninstall();
  } catch {
    // A future version could rename or drop the method; losing the red box is not worth a crash
    // inside the crash reporter.
  }
}
