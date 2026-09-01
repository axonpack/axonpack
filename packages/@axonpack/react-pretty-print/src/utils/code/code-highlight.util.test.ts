import { expect, test } from 'bun:test';

import {
  detectLanguage,
  formatCode,
  SUPPORTED_LANGUAGES,
  tokenize,
  type Language,
} from './code-highlight.util';

test('detectLanguage prefers the content type', () => {
  expect(detectLanguage('application/javascript; charset=utf-8', '')).toBe('javascript');
  expect(detectLanguage('application/typescript', '')).toBe('typescript');
  expect(detectLanguage('text/css', '')).toBe('css');
  expect(detectLanguage('image/svg+xml', '')).toBe('svg');
  expect(detectLanguage('text/html', '')).toBe('html');
  expect(detectLanguage('application/ld+json', '')).toBe('json');
  expect(detectLanguage('application/x-yaml', '')).toBe('yaml');
  // `x-java` must not swallow `x-javascript`.
  expect(detectLanguage('text/x-java', '')).toBe('java');
  expect(detectLanguage('text/x-javascript', '')).toBe('javascript');
});

test('detectLanguage sniffs the body when the content type is unhelpful', () => {
  expect(detectLanguage(undefined, '<!DOCTYPE html><html></html>')).toBe('html');
  expect(detectLanguage(undefined, '<svg viewBox="0 0 1 1"/>')).toBe('svg');
  expect(detectLanguage(undefined, '<?xml version="1.0"?><a/>')).toBe('xml');
  expect(detectLanguage('text/plain', '{"a":1}')).toBe('json');
  expect(detectLanguage('text/plain', '.a { color: red }')).toBe('css');
  expect(detectLanguage('text/plain', '#!/bin/bash\necho hi')).toBe('bash');
  expect(detectLanguage('text/plain', '#!/usr/bin/env python\nx = 1')).toBe('python');
  expect(detectLanguage('text/plain', 'diff --git a/x b/x')).toBe('diff');
  expect(detectLanguage('text/plain', '# Title\n\ntext')).toBe('markdown');
  expect(detectLanguage('text/plain', '[server]\nport = 80')).toBe('ini');
  expect(detectLanguage('text/plain', 'name: axonpack\nversion: 1')).toBe('yaml');
  expect(detectLanguage(undefined, 'just words')).toBe('plain');
});

test('tokenize classifies javascript and loses nothing', () => {
  const code = 'const x = "hi"; // note';
  const tokens = tokenize(code, 'javascript');

  expect(tokens.map((t) => t.text).join('')).toBe(code);
  expect(tokens.find((t) => t.text === 'const')?.type).toBe('keyword');
  expect(tokens.find((t) => t.text === '"hi"')?.type).toBe('string');
  expect(tokens.find((t) => t.text === '// note')?.type).toBe('comment');
});

test('tokenize splits markup into tags, attributes and values', () => {
  const types = new Map(tokenize('<a href="/x">hi</a>', 'html').map((t) => [t.text, t.type]));
  expect(types.get('<a')).toBe('tag');
  expect(types.get('href')).toBe('attr-name');
  expect(types.get('"/x"')).toBe('attr-value');
});

test('tokenize reads JSON keys apart from string values', () => {
  const types = new Map(
    tokenize('{"id":"a",Cbool:true}'.replace('Cbool', '"ok"'), 'json').map((t) => [t.text, t.type])
  );
  expect(types.get('"id"')).toBe('attr-name');
  expect(types.get('"a"')).toBe('string');
  expect(types.get('true')).toBe('keyword');
});

test('plain is one token, never a per-character walk', () => {
  expect(tokenize('anything at all', 'plain')).toEqual([
    { type: 'plain', text: 'anything at all' },
  ]);
});

/**
 * One realistic line per language. The two assertions are what actually matter for a tokenizer:
 * nothing is dropped, and the rule table fires at all — a table that matched nothing would still
 * render, just entirely unstyled, which is easy to miss by eye across this many languages.
 */
const SAMPLES: Record<Language, string> = {
  javascript: 'const total = items.reduce((a, b) => a + b, 0); // sum',
  typescript: 'export interface User { id: number; name?: string }',
  tsx: 'const App = () => <View style={styles.row}>{label}</View>;',
  java: '@Override public String getName() { return this.name; }',
  kotlin: 'data class User(val id: Int, val name: String? = null)',
  swift: 'guard let user = try? await client.fetch(id) else { return }',
  go: 'func total(items []Item) (int, error) { return 0, nil }',
  rust: '#[derive(Debug)] pub struct User { pub id: u64 }',
  c: 'static int total(const int *xs, size_t n) { return 0; }',
  cpp: 'template <typename T> constexpr T max(T a, T b) { return a > b ? a : b; }',
  csharp: 'public async Task<User> GetAsync(int id) => await _db.Find(id);',
  php: '<?php function total(array $items): int { return count($items); }',
  dart: 'Future<User> fetch(int id) async => await client.get(id);',
  scala: 'case class User(id: Int, name: Option[String] = None)',
  protobuf: 'message User { optional string name = 1; repeated int64 ids = 2; }',
  python: 'def total(items):\n    return sum(i.price for i in items)  # sum',
  ruby: 'def total(items) = items.sum { |i| i.price } # sum',
  bash: 'if [ -f "$1" ]; then echo "found"; fi # check',
  dockerfile: 'FROM node:24-alpine AS build\nRUN npm ci --omit=dev',
  makefile: 'build: ## compile\n\ttsc --noEmit',
  graphql: 'query User($id: ID!) { user(id: $id) { id name } } # fetch',
  yaml: 'name: axonpack\nversions:\n  - 1.0 # first',
  toml: '[server]\nport = 8080\ndebug = true',
  ini: '[server]\nport = 8080 ; inline',
  properties: 'server.port=8080\n# a comment',
  json: '{"id":4821,"name":"Ada","ok":true,"tags":[1,2]}',
  json5: '{ id: 4821, /* trailing */ ok: true, }',
  html: '<section class="card"><h2>Totals</h2><!-- note --></section>',
  xml: '<feed count="2"><item id="a">One</item></feed>',
  svg: '<svg viewBox="0 0 8 8"><path d="M0 0h8v8H0z" fill="#fff"/></svg>',
  markdown: '# Title\n\nSome **bold** and `code` and [a link](https://x.dev).',
  css: '.card { padding: 12px; border: 1px solid #30363d }',
  scss: '$gap: 8px;\n.card { padding: $gap; &:hover { opacity: .8 } }',
  less: '@gap: 8px;\n.card { padding: @gap; }',
  sql: 'SELECT id, name FROM users WHERE id = 4821 ORDER BY name; -- lookup',
  diff: 'diff --git a/x b/x\n@@ -1 +1 @@\n-old\n+new',
  log: '2026-09-09T21:04:11Z  WARN  cache miss key=user:4821 (214ms)',
  plain: 'nothing structured about this line at all',
};

test('every supported language has a sample and a rule table that fires', () => {
  expect(SUPPORTED_LANGUAGES).toHaveLength(38);

  for (const language of SUPPORTED_LANGUAGES) {
    const source = SAMPLES[language];
    expect(source, `${language} needs a sample`).toBeTruthy();

    const tokens = tokenize(source, language);
    expect(tokens.map((t) => t.text).join(''), `${language} lost text`).toBe(source);

    if (language === 'plain') continue;
    const classified = tokens.filter((t) => t.type !== 'plain');
    expect(classified.length, `${language} matched no rule`).toBeGreaterThan(0);
  }
});

test('formatCode re-indents brace-and-semicolon languages', () => {
  // No trailing `;` is invented: the last declaration may omit it, and re-indenting is not
  // rewriting.
  expect(formatCode('a{b:1;c:2}', 'css')).toBe('a {\n  b: 1;\n  c: 2\n}');
  expect(formatCode('a{b:1;c:2;}', 'css')).toBe('a {\n  b: 1;\n  c: 2;\n}');
  // A re-indenter, not a pretty-printer: it breaks on `{}`, `[]` and `;` and spaces `,` and `:`,
  // but never inserts a space after a keyword, so `if(a)` keeps its shape.
  expect(formatCode('if(a){b()}', 'javascript')).toBe('if(a) {\n  b()\n}');
  expect(formatCode('{"a":1}', 'json')).toBe('{\n  "a": 1\n}');
  expect(formatCode('func f(){return 1}', 'go')).toContain('\n');
});

test('formatCode leaves alone every language whose whitespace or shape is its own', () => {
  const untouched: [Language, string][] = [
    ['python', 'def f():\n    return 1'],
    ['yaml', 'a:\n  - 1'],
    ['html', '<p>a</p><p>b</p>'],
    ['markdown', '# A\n\ntext'],
    ['bash', 'if [ -f x ]; then echo hi; fi'],
    ['diff', '@@ -1 +1 @@\n-a\n+b'],
    ['log', 'WARN  key=user:1'],
    ['ini', '[a]\nb=1'],
    ['plain', 'WARN  key=user:4821'],
  ];

  for (const [language, source] of untouched) {
    expect(formatCode(source, language), language).toBe(source);
  }
});
