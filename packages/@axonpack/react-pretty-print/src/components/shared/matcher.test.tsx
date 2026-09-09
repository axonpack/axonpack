import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { CodeHighlight } from '../code/code-highlight.component';
import { JsonTree } from '../json/json-tree.component';
import { domPrimitives } from './primitives.ui';
import { DARK_THEME } from '../../themes';
import { buildMatcher, DEFAULT_SEARCH_MODES } from '../../utils/shared/text-search.util';

const band = `background-color:${DARK_THEME.matchHighlight}`;
const matcherFor = (text: string, modes = {}) =>
  buildMatcher({ text, ...DEFAULT_SEARCH_MODES, ...modes });

const value = {
  note: 'the quick brown fox',
  nested: { deep: { needle: 'found here' } },
  other: { untouched: 'nothing to see' },
};

/**
 * The contract is a plain `{ pattern, invalid }` object, so a caller that already compiled one for
 * its own list filtering passes it in with nothing to convert. This is that object built by hand,
 * standing in for such a caller.
 */
test('a matcher built elsewhere works without conversion', () => {
  const foreign = { pattern: /brown/gi, invalid: false };
  const html = renderToStaticMarkup(
    <JsonTree primitives={domPrimitives} value={value} matcher={foreign} />
  );
  expect(html).toContain(band);
});

test('a match paints a band behind the run, not the whole node', () => {
  const html = renderToStaticMarkup(
    <JsonTree primitives={domPrimitives} value={value} matcher={matcherFor('quick')} />
  );
  // The matched run is its own node; the rest of the string is not inside the band.
  expect(html).toContain(`<span style="${band}">quick</span>`);
});

test('a search opens the branches holding a match and collapses the rest', () => {
  const html = renderToStaticMarkup(
    <JsonTree primitives={domPrimitives} value={value} matcher={matcherFor('needle')} />
  );

  // Opened all the way down to the hit: three ancestors plus the root are open, and the matched
  // key is painted.
  expect(html.match(/▾/g)).toHaveLength(3);
  expect(html).toContain(`<span style="${band}">needle</span>`);
  expect(html).toContain('found here');

  // The branch with no hit stays closed — exactly one arrow is still pointing right. Its content
  // is nonetheless in the html, because a closed node previews what is inside it; that is the
  // preview, not a rendered row.
  expect(html.match(/▸/g)).toHaveLength(1);
  expect(html).toContain('{untouched: &quot;nothing to see&quot;}');
});

test('no matcher leaves the default expansion alone', () => {
  const html = renderToStaticMarkup(<JsonTree primitives={domPrimitives} value={value} />);
  expect(html).not.toContain(band);
  // Root open, children closed: `nested` is visible as a row, its leaf is not.
  expect(html).toContain('nested');
  expect(html).not.toContain('found here');
});

test('an uncompilable pattern is treated as no search rather than no results', () => {
  const broken = matcherFor('([', { regex: true });
  expect(broken?.invalid).toBe(true);
  expect(broken?.pattern).toBeNull();

  const html = renderToStaticMarkup(
    <JsonTree primitives={domPrimitives} value={value} matcher={broken} />
  );
  // A half-typed regex must not collapse the tree to nothing.
  expect(html).toContain('nested');
  expect(html).not.toContain(band);
});

test('a match spanning a token boundary paints across both halves', () => {
  // `x=1` tokenizes as identifier, operator, number — one match crossing all three.
  const html = renderToStaticMarkup(
    <CodeHighlight
      primitives={domPrimitives}
      code="const x=1;"
      language="javascript"
      format={false}
      matcher={matcherFor('x=1')}
    />
  );

  const bands = [...html.matchAll(new RegExp(band, 'g'))];
  expect(bands.length).toBeGreaterThanOrEqual(3);
});

test('an unhighlighted body still highlights matches', () => {
  const html = renderToStaticMarkup(
    <CodeHighlight
      primitives={domPrimitives}
      code="plain prose with a needle in it"
      language="plain"
      matcher={matcherFor('needle')}
    />
  );
  expect(html).toContain(`<span style="${band}">needle</span>`);
});
