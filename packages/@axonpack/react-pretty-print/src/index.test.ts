import { expect, test } from 'bun:test';

import * as api from './index';

const themeNames = Object.keys(api).filter((name) => name.endsWith('_THEME'));

/**
 * The layer barrels expose everything beside them, including the internal `JsonNode`/`XmlNode`
 * renderers and the style builders, so the root entry has to stay curated. This pins the value
 * exports that aren't palettes: a barrel that starts leaking, or a rename that silently drops one,
 * fails here rather than in a consumer's build. Type-only exports don't exist at runtime.
 */
test('the published surface, palettes aside, is exactly this', () => {
  const rest = Object.keys(api)
    .filter((name) => !name.endsWith('_THEME'))
    .sort();

  expect(rest).toEqual([
    'ARRAY_CHUNK_SIZE',
    'CodeHighlight',
    'JsonTree',
    'MAX_HIGHLIGHT_LENGTH',
    'SUPPORTED_LANGUAGES',
    'XmlTree',
    'buildPreview',
    'chunkArrayRange',
    'collectExpandablePaths',
    'detectLanguage',
    'domPrimitives',
    'formatCode',
    'formatCopyValue',
    'hasChildren',
    'isExpandable',
    'isPlainObject',
    'parseXml',
    'tokenize',
  ]);
});

test('the palettes reach the root entry', () => {
  expect(themeNames).toHaveLength(130);
  expect(themeNames).toContain('DARK_THEME');
  expect(themeNames).toContain('LIGHT_THEME');
  expect(themeNames).toContain('AZURE_DARK_VIVID_THEME');
});

test('the internal renderers and style builders stay internal', () => {
  expect(api).not.toHaveProperty('JsonNode');
  expect(api).not.toHaveProperty('XmlNode');
  expect(api).not.toHaveProperty('buildTreeStyles');
  expect(api).not.toHaveProperty('buildCodeStyles');
  expect(api).not.toHaveProperty('INDENT_PER_DEPTH');
});
