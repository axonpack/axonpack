import { consoleLogStore } from '../../stores/console/console-log.store';
import type { CrashBreadcrumb } from '../../stores/crash/crash.store';
import { networkLogStore } from '../../stores/network/network-log.store';

/**
 * The last thing the app did before it broke, assembled from ring buffers that already exist — which
 * is the whole reason this is cheap enough to run inside an error handler. Nothing is recorded *for*
 * crash reporting; a crash just reads what the Console and Network tabs were holding anyway.
 *
 * Off in production by default: a breadcrumb trail carries request URLs and whatever the app logged,
 * which is a different privacy proposition from a stack trace.
 */
export function collectBreadcrumbs(limit: number): CrashBreadcrumb[] {
  const crumbs: CrashBreadcrumb[] = [];

  try {
    for (const entry of consoleLogStore.getSnapshot().slice(0, limit)) {
      crumbs.push({
        at: entry.timestamp,
        category: 'console',
        level: entry.level,
        message: entry.count > 1 ? `${entry.text} (x${entry.count})` : entry.text,
      });
    }
  } catch {
    // A breadcrumb trail is a nice-to-have; never let it cost us the record it decorates.
  }

  try {
    for (const entry of networkLogStore.getSnapshot().slice(0, limit)) {
      crumbs.push({
        at: entry.startedAt,
        category: 'network',
        level: entry.status,
        message: `${entry.method} ${entry.url}${entry.statusCode ? ` → ${entry.statusCode}` : ''}`,
      });
    }
  } catch {
    // As above.
  }

  return crumbs.sort((a, b) => b.at - a.at).slice(0, limit);
}
