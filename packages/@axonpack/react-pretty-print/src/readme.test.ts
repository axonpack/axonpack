import { expect, test } from 'bun:test';

import { SUPPORTED_LANGUAGES } from './index';
import * as themes from './themes';

const README = await Bun.file(new URL('../README.md', import.meta.url)).text();

/**
 * The README documents exact identifiers, so it can be wrong in a way prose review misses — a
 * palette that no longer exists reads perfectly and fails on the reader's first import. It named
 * `DRACULA_DARK_VIVID_THEME` for exactly this reason, left behind by a palette set that was
 * removed.
 */
test('every palette the README names is exported', () => {
  const named = [...new Set(README.match(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*_THEME\b/g) ?? [])];

  expect(named.length).toBeGreaterThan(0);
  for (const name of named) {
    expect(themes, name).toHaveProperty(name);
  }
});

/** Same risk in the language table: a renamed language would still read fine. */
test('every language the README lists in its table is supported', () => {
  const table = README.slice(README.indexOf('## Languages'), README.indexOf('## Utilities'));
  const named = [...new Set(table.match(/`([a-z][a-z0-9]*)`/g) ?? [])].map((m) => m.slice(1, -1));
  const listed = named.filter((name) => name !== 'format');

  expect(listed.length).toBeGreaterThan(30);
  for (const language of listed) {
    expect(SUPPORTED_LANGUAGES as string[], language).toContain(language);
  }
});
