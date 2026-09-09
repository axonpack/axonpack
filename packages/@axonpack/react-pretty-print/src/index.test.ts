import { expect, test } from 'bun:test';

import * as api from './index';
import * as themes from './themes';

/**
 * The layer barrels expose everything beside them, including the internal `JsonNode`/`XmlNode`
 * renderers and the style builders, so the root entry has to stay curated. This pins the value
 * exports that aren't palettes: a barrel that starts leaking, or a rename that silently drops one,
 * fails here rather than in a consumer's build. Type-only exports don't exist at runtime.
 */
test('the published surface is exactly this', () => {
  expect(Object.keys(api).sort()).toEqual([
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

/**
 * The palettes are ~52KB, so they are their own entry point rather than part of the root barrel: a
 * consumer that only wants a renderer should not pull them in to find out it didn't need them.
 */
test('the palettes are on their own entry point, not the root one', () => {
  expect(Object.keys(api).filter((name) => name.endsWith('_THEME'))).toEqual([]);

  const names = Object.keys(themes).filter((name) => name.endsWith('_THEME'));
  expect(names).toHaveLength(130);
  expect(names).toContain('DARK_THEME');
  expect(names).toContain('LIGHT_THEME');
  expect(names).toContain('AZURE_DARK_VIVID_THEME');
});

test('the internal renderers and style builders stay internal', () => {
  expect(api).not.toHaveProperty('JsonNode');
  expect(api).not.toHaveProperty('XmlNode');
  expect(api).not.toHaveProperty('buildTreeStyles');
  expect(api).not.toHaveProperty('buildCodeStyles');
  expect(api).not.toHaveProperty('INDENT_PER_DEPTH');
});
