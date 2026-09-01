import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { CodeHighlight } from './code-highlight.component';
import { domPrimitives } from '../shared/primitives.ui';
import { DARK_THEME } from '../../themes';

/** The rendered text, with the entities React escapes on the way out put back. */
function text(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

test('CodeHighlight paints one span per token, coloured by type', () => {
  const html = renderToStaticMarkup(
    <CodeHighlight primitives={domPrimitives} code='const x = "hi";' language="javascript" />
  );

  expect(html).toContain(`color:${DARK_THEME.keyword}`);
  expect(html).toContain(`color:${DARK_THEME.string}`);
  // No text is dropped between tokens.
  expect(text(html)).toBe('const x = "hi";');
});

test('CodeHighlight renders plain language as a single unhighlighted block', () => {
  const html = renderToStaticMarkup(
    <CodeHighlight primitives={domPrimitives} code="just words" language="plain" />
  );
  expect(html.match(/<span/g)).toHaveLength(1);
});

test('CodeHighlight formats by default and leaves source alone when told to', () => {
  const minified = 'a{b:1}';
  const formatted = text(
    renderToStaticMarkup(
      <CodeHighlight primitives={domPrimitives} code={minified} language="css" />
    )
  );
  const verbatim = text(
    renderToStaticMarkup(
      <CodeHighlight primitives={domPrimitives} code={minified} language="css" format={false} />
    )
  );

  expect(formatted).toContain('\n');
  expect(verbatim).toBe(minified);
});

test('formatted newlines survive on the DOM, which collapses whitespace', () => {
  const html = renderToStaticMarkup(
    <CodeHighlight primitives={domPrimitives} code="a{b:1;c:2}" language="css" />
  );

  // Without this the re-indented listing renders as one long line in a browser: the `\n` and the
  // leading indent that `formatCode` emits are collapsed by HTML.
  expect(html).toContain('white-space:pre');
  expect(text(html)).toContain('\n  b: 1;');
});
