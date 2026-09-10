import { expect, test } from 'bun:test';
import {
  detectLanguage,
  formatCode,
  parseXml,
  SUPPORTED_LANGUAGES,
  tokenize,
  type Language,
} from '@axonpack/react-pretty-print';

import { CODE_SAMPLES, sampleData, sampleXml } from './sample-data';

/**
 * The example is the only place all 38 languages and every renderer are actually looked at, so its
 * fixtures are load-bearing: a sample that demonstrates nothing makes the panel look right while
 * showing nothing, which is exactly the failure eyeballing a screen misses.
 *
 * These are the same fixtures the native example uses, and the same assertions: the two examples keep
 * their own copies deliberately, so the tests do too. Rendering is covered in `render.test.tsx`.
 */
test('every supported language has a sample', () => {
  for (const language of SUPPORTED_LANGUAGES) {
    expect(CODE_SAMPLES[language], language).toBeTruthy();
  }
  // Keyed by language, so a stray key would silently never be shown by the picker.
  expect(Object.keys(CODE_SAMPLES).sort()).toEqual([...SUPPORTED_LANGUAGES].sort());
});

test('every sample actually exercises the language it is filed under', () => {
  for (const language of SUPPORTED_LANGUAGES) {
    if (language === 'plain') continue;

    const tokens = tokenize(CODE_SAMPLES[language], language);
    const classified = tokens.filter((token) => token.type !== 'plain');
    expect(classified.length, `${language} sample highlights nothing`).toBeGreaterThan(0);
  }
});

test('samples are unformatted, so the format toggle visibly does something', () => {
  const formattable = SUPPORTED_LANGUAGES.filter(
    (language) => formatCode('a{b:1}', language) !== 'a{b:1}'
  );

  expect(formattable.length).toBeGreaterThan(15);
  for (const language of formattable) {
    const sample = CODE_SAMPLES[language];
    expect(formatCode(sample, language), `${language} sample is already formatted`).not.toBe(
      sample
    );
  }
});

test('the markup samples are what detection would call them', () => {
  const cases: [Language, string][] = [
    ['html', 'text/html'],
    ['xml', 'application/xml'],
    ['svg', 'image/svg+xml'],
    ['json', 'application/json'],
  ];
  for (const [language, mimeType] of cases) {
    expect(detectLanguage(mimeType, CODE_SAMPLES[language]), language).toBe(language);
  }
});

test('the json fixture covers every branch of the tree', () => {
  const values = Object.values(sampleData);

  expect(values).toContainEqual(null);
  expect(values.some((v) => typeof v === 'boolean')).toBe(true);
  expect(values.some((v) => typeof v === 'number')).toBe(true);
  // A long string, so the collapsed preview has to truncate.
  expect(values.some((v) => typeof v === 'string' && v.length > 80)).toBe(true);
  // Empty containers, which get no toggle.
  expect(values).toContainEqual({});
  expect(values).toContainEqual([]);
  // Past the chunk size, so the tree buckets it.
  expect(sampleData.events.length).toBeGreaterThan(10);
  // Nesting, so recursive expand has something to do.
  expect(sampleData.user.address.geo).toBeTruthy();
});

test('the xml fixture parses, and exercises attributes, entities and cdata', () => {
  const parsed = parseXml(sampleXml);
  if ('error' in parsed) throw new Error(`fixture does not parse: ${parsed.error}`);

  expect(parsed.root.name).toBe('feed');
  expect(parsed.root.attributes.length).toBeGreaterThan(0);
  expect(sampleXml).toContain('&amp;');
  expect(sampleXml).toContain('<![CDATA[');
});
