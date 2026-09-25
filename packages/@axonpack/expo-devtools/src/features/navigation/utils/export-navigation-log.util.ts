import { Platform, Share } from 'react-native';

import {
  formatActionLabel,
  formatClockTime,
  formatMoveTitle,
  timeOnScreen,
} from './format-navigation.util';
import { encodeBase64 } from '../../../core/utils/base64.util';
import { formatDuration } from '../../../core/utils/format-duration.util';
import type { NavigationMove, NavigationRoute } from '../stores/navigation.store';

export const NAVIGATION_EXPORT_SCHEMA_VERSION = 1;

export function navigationLogFileName(): string {
  return `navigation-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
}

/** The export file's text. Oldest first, since a file is read top to bottom. */
export function navigationLogJson(moves: readonly NavigationMove[]): string {
  const file = {
    schemaVersion: NAVIGATION_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    moves: [...moves].reverse(),
  };
  return JSON.stringify(file, null, 2);
}

function routeLine(route: NavigationRoute | null): string {
  if (!route) return '(none)';
  const params =
    route.params && Object.keys(route.params).length > 0 ? ` ${JSON.stringify(route.params)}` : '';
  return `${route.name}${route.path ? ` (${route.path})` : ''}${params}`;
}

/**
 * The history as Markdown, for an issue or a chat: one line per move, oldest first, with how long
 * each screen stayed on top. A fenced block keeps the arrows and braces from being re-wrapped.
 */
export function navigationLogMarkdown(
  moves: readonly NavigationMove[],
  currentRoute: NavigationRoute | null
): string {
  const lines = moves.map((move, index) => {
    const stayed = timeOnScreen(moves, index);
    const params =
      move.to?.params && Object.keys(move.to.params).length > 0
        ? `  ${JSON.stringify(move.to.params)}`
        : '';
    const stay = stayed === null ? '' : `  (${formatDuration(stayed)} on screen)`;
    const noop = move.noop ? '  (no change)' : '';
    return `${formatClockTime(move.timestamp)}  ${formatActionLabel(move.action)}  ${formatMoveTitle(move)}${params}${stay}${noop}`;
  });

  return [
    '## Navigation',
    '',
    `Current route: ${routeLine(currentRoute)}`,
    '',
    '```',
    ...[...lines].reverse(),
    '```',
  ].join('\n');
}

/**
 * Hands the history to the OS share sheet as JSON, the way the Network tab exports: a `data:` URL
 * on iOS so the sheet has a named file to offer, the text itself on Android.
 */
export async function shareNavigationLog(moves: readonly NavigationMove[]) {
  const text = navigationLogJson(moves);
  try {
    if (Platform.OS === 'ios') {
      await Share.share({
        title: navigationLogFileName(),
        message: text,
        url: `data:application/json;base64,${encodeBase64(text)}`,
      });
      return;
    }
    await Share.share({ title: navigationLogFileName(), message: text });
  } catch {
    // The user dismissed the sheet, or there is nothing installed to share to.
  }
}
