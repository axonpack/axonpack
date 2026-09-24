import type { LimiterTarget } from '../constants/limiter.const';

export function formatPreset(ms: number): string {
  return ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`;
}

/** What blocking the chosen thread does, or why it cannot. */
export function blockNote(target: LimiterTarget, mainThreadAvailable: boolean): string {
  if (target === 'main' && !mainThreadAvailable) {
    return 'Blocking the main thread needs a dev build. The JS thread works anywhere.';
  }
  return target === 'js'
    ? 'Blocking shows up as a long task and drops the JS frame rate. Both show on the Performance tab.'
    : 'Blocking freezes the screen while JavaScript keeps ticking. The Performance tab shows the gap: its JS numbers stay fine throughout.';
}

/**
 * The two crashes are not the same event, and the difference is the whole point of the Crashes tab:
 * a JS throw is caught and reported before you let go of the button, while a main-thread crash ends
 * the process and is read back off disk at the next launch.
 */
export function crashNote(target: LimiterTarget): string {
  return target === 'js'
    ? 'Crashing throws on the JS thread. The report opens straight away and stays in the Crashes tab.'
    : 'Crashing ends the process. Reopen the app and the report is waiting in the Crashes tab.';
}
