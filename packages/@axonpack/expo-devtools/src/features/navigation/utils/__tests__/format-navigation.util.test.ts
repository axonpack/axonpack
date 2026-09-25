import type { NavigationMove } from '../../stores/navigation.store';
import {
  formatActionLabel,
  formatMoveTitle,
  formatParamsPreview,
  timeOnScreen,
} from '../format-navigation.util';

function move(patch: Partial<NavigationMove>): NavigationMove {
  return {
    id: 'm',
    container: 'root',
    timestamp: 0,
    action: 'NAVIGATE',
    from: null,
    to: null,
    noop: false,
    ...patch,
  };
}

describe('formatActionLabel', () => {
  it('reads an action type as words', () => {
    expect(formatActionLabel('GO_BACK')).toBe('Go back');
    expect(formatActionLabel('JUMP_TO')).toBe('Jump to');
    expect(formatActionLabel('INITIAL')).toBe('Start');
    expect(formatActionLabel('UNKNOWN')).toBe('Changed');
  });
});

describe('formatMoveTitle', () => {
  it('names both ends, or just the destination on the first row', () => {
    const home = { key: 'a', name: 'Home' };
    const details = { key: 'b', name: 'Details' };
    expect(formatMoveTitle(move({ from: home, to: details }))).toBe('Home → Details');
    expect(formatMoveTitle(move({ to: home }))).toBe('Home');
    expect(formatMoveTitle(move({ from: home, to: null }))).toBe('Home → (none)');
  });
});

describe('formatParamsPreview', () => {
  it('is one line, cut past 120 characters, and nothing for no params', () => {
    expect(formatParamsPreview(undefined)).toBeNull();
    expect(formatParamsPreview({})).toBeNull();
    expect(formatParamsPreview({ id: 7 })).toBe('{"id":7}');
    expect(formatParamsPreview({ long: 'x'.repeat(200) })?.length).toBe(121);
  });
});

describe('timeOnScreen', () => {
  it('is the gap to the next move, newest first, and nothing for the newest', () => {
    const moves = [
      move({ id: 'c', timestamp: 3000 }),
      move({ id: 'b', timestamp: 1500 }),
      move({ id: 'a', timestamp: 1000 }),
    ];
    expect(timeOnScreen(moves, 0)).toBeNull();
    expect(timeOnScreen(moves, 1)).toBe(1500);
    expect(timeOnScreen(moves, 2)).toBe(500);
    expect(timeOnScreen(moves, 3)).toBeNull();
  });
});
