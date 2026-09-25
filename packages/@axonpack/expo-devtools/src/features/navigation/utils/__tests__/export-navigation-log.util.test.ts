import type { NavigationMove } from '../../stores/navigation.store';
import { navigationLogJson, navigationLogMarkdown } from '../export-navigation-log.util';

const home = { key: 'a', name: 'Home', path: '/' };
const details = { key: 'b', name: 'Details', path: '/details/7', params: { id: 7 } };

/** Newest first, as the store keeps them. */
const moves: NavigationMove[] = [
  {
    id: 'm2',
    container: 'root',
    timestamp: 1_700_000_002_000,
    action: 'NAVIGATE',
    from: home,
    to: details,
    noop: false,
  },
  {
    id: 'm1',
    container: 'root',
    timestamp: 1_700_000_000_000,
    action: 'INITIAL',
    from: null,
    to: home,
    noop: false,
  },
];

describe('navigationLogJson', () => {
  it('carries a schema version and lists the moves oldest first', () => {
    const file = JSON.parse(navigationLogJson(moves));
    expect(file.schemaVersion).toBe(1);
    expect(file.moves.map((m: NavigationMove) => m.id)).toEqual(['m1', 'm2']);
  });
});

describe('navigationLogMarkdown', () => {
  it('names the current route and fences one line per move, oldest first', () => {
    const text = navigationLogMarkdown(moves, details);
    const lines = text.split('\n');

    expect(lines[0]).toBe('## Navigation');
    expect(lines[2]).toBe('Current route: Details (/details/7) {"id":7}');
    const fenced = lines.slice(lines.indexOf('```') + 1, lines.lastIndexOf('```'));
    expect(fenced).toHaveLength(2);
    expect(fenced[0]).toMatch(/Start  Home  \(2 s on screen\)$/);
    expect(fenced[1]).toMatch(/Navigate  Home → Details  \{"id":7\}$/);
  });
});
