import {
  consoleLogStore,
  useConsoleLogStore,
} from '../../features/console/stores/console-log.store';
import { crashStore, useCrashStore } from '../../features/crash/stores/crash.store';

function Badge({ count }: { count: number }) {
  return count > 0 ? <span className="axonpack-panel-badge">{count}</span> : null;
}

/** Errors and crashes, the count the app's Console tab carries. A number, so only it re-renders. */
export function ConsoleBadge() {
  return <Badge count={useConsoleLogStore(consoleLogStore.getErrorCount)} />;
}

/** Reports not yet opened on either side, the count the app's Crashes tab carries. */
export function CrashesBadge() {
  return <Badge count={useCrashStore(crashStore.getUnseenCount)} />;
}
