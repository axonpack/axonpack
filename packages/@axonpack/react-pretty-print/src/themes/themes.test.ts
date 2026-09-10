import { expect, test } from 'bun:test';

import * as themes from './index';
import type { PrettyPrintTheme } from './theme.const';

/** The colour tokens only — `fontFamily` and `fontSize` are not colours. */
type ColourToken = Exclude<keyof PrettyPrintTheme, 'fontFamily' | 'fontSize'>;

const TOKENS: ColourToken[] = [
  'background',
  'key',
  'string',
  'number',
  'boolean',
  'null',
  'punctuation',
  'toggle',
  'text',
  'keyword',
  'comment',
  'accent',
  'tag',
];

const entries = Object.entries(themes).filter((entry): entry is [string, PrettyPrintTheme] =>
  entry[0].endsWith('_THEME')
);

const rgb = (value: string) =>
  [1, 3, 5].map((i) => Number.parseInt(value.slice(i, i + 2), 16)) as [number, number, number];

function luminance(colour: string) {
  const [r, g, b] = rgb(colour).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('every palette fills the whole contract with hex colours', () => {
  expect(entries).toHaveLength(130);

  for (const [name, theme] of entries) {
    for (const token of TOKENS) {
      expect(theme[token], `${name}.${token}`).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(theme.fontFamily, `${name}.fontFamily`).toBe('monospace');
    expect(theme.fontSize, `${name}.fontSize`).toBe(12);
  }
});

/** The reason these are generated rather than eyeballed: contrast is solved for, so assert it. */
test('body text clears WCAG AA against its own background, and no token falls below 3:1', () => {
  for (const [name, theme] of entries) {
    expect(contrast(theme.text, theme.background), `${name} text`).toBeGreaterThanOrEqual(4.5);

    for (const token of TOKENS) {
      if (token === 'background') continue;
      expect(
        contrast(theme[token], theme.background),
        `${name}.${token} on background`
      ).toBeGreaterThanOrEqual(3);
    }
  }
});

test('keys and strings never share a colour, or a JSON tree is unreadable', () => {
  for (const [name, theme] of entries) {
    expect(theme.key, `${name}`).not.toBe(theme.string);
  }
});

test('one muted tone serves punctuation, the arrow and null', () => {
  for (const [name, theme] of entries) {
    expect(theme.punctuation, `${name}`).toBe(theme.toggle);
    expect(theme.punctuation, `${name}`).toBe(theme.null);
  }
});

/**
 * A palette named for a hue has to actually be that hue. Worth asserting separately because
 * contrast is hue-blind: rotating every colour a third of the way round the wheel leaves every
 * ratio below intact while painting each `AZURE_*` palette green.
 */
test('a palette named for a hue is that hue', () => {
  const expectations: [string, (c: [number, number, number]) => boolean][] = [
    ['CRIMSON', ([r, , b]) => r > b],
    ['EMERALD', ([r, g]) => g > r],
    ['AZURE', ([r, , b]) => b > r],
    ['SAPPHIRE', ([r, , b]) => b > r],
    ['GOLD', ([r, , b]) => r > b],
  ];

  for (const [hue, holds] of expectations) {
    const matching = entries.filter(([name]) => name.startsWith(`${hue}_`));
    expect(matching.length, hue).toBeGreaterThan(0);
    for (const [name, theme] of matching) {
      expect(holds(rgb(theme.key)), `${name}.key`).toBe(true);
    }
  }
});
