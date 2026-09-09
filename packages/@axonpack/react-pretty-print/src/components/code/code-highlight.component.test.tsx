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

test('the highlight cap is overridable in both directions', () => {
  const long = 'const a = 1;'.repeat(60); // 720 chars
  const highlighted = (html: string) => html.includes(`color:${DARK_THEME.keyword}`);

  // Default cap: well under it, so this highlights.
  expect(
    highlighted(
      renderToStaticMarkup(
        <CodeHighlight primitives={domPrimitives} code={long} language="javascript" />
      )
    )
  ).toBe(true);

  // Lowered below the input, so it renders as one unstyled block instead.
  const capped = renderToStaticMarkup(
    <CodeHighlight
      primitives={domPrimitives}
      code={long}
      language="javascript"
      maxHighlightLength={100}
    />
  );
  expect(highlighted(capped)).toBe(false);
  expect(capped.match(/<span/g)).toHaveLength(1);
  // Nothing is truncated — only the highlighting is skipped.
  expect(text(capped)).toBe(long);

  // Raised past the default, so a body over 50k still highlights.
  const huge = 'const a = 1;'.repeat(5000); // 60k chars
  expect(
    highlighted(
      renderToStaticMarkup(
        <CodeHighlight
          primitives={domPrimitives}
          code={huge}
          language="javascript"
          maxHighlightLength={Infinity}
        />
      )
    )
  ).toBe(true);
  // ...and is left alone at the default.
  expect(
    highlighted(
      renderToStaticMarkup(
        <CodeHighlight primitives={domPrimitives} code={huge} language="javascript" />
      )
    )
  ).toBe(false);
});
