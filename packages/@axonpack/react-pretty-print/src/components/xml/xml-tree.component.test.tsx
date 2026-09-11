import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { XmlTree } from './xml-tree.component';
import { domPrimitives } from '../shared/primitives.ui';
import { DARK_THEME } from '../../themes';

test('XmlTree opens the root and keeps its children closed', () => {
  const html = renderToStaticMarkup(
    <XmlTree primitives={domPrimitives} source="<feed><item>One</item></feed>" />
  );

  expect(html).toContain('&lt;feed');
  expect(html).toContain('&lt;item');
  // The item is visible but unopened, so its text is not.
  expect(html).not.toContain('One');
  expect(html).toContain('&lt;/feed&gt;');
});

test('XmlTree explains an unparseable document instead of throwing', () => {
  const html = renderToStaticMarkup(<XmlTree primitives={domPrimitives} source="<a><b></a>" />);
  expect(html).toContain('Could not read this as XML');
  expect(html).toContain('does not match');
});

test('XmlTree gives a childless element no toggle', () => {
  const html = renderToStaticMarkup(<XmlTree primitives={domPrimitives} source="<a/>" />);
  expect(html).not.toContain('▸');
  expect(html).toContain('/&gt;');
});

test('a tag packs left instead of spreading its attributes across the row', () => {
  const html = renderToStaticMarkup(
    <XmlTree primitives={domPrimitives} source='<feed count="2" lang="en"/>' />
  );

  // `flex:1` on siblings makes each grow to an equal share, which is what spread the attributes
  // over the full width. Only a row's single filling node may carry it.
  expect(html).not.toContain('flex:1');
  // `gap` separates them instead of a literal leading space, which CSS trims off a flex item.
  expect(html).toContain('column-gap:4px');
  // Each attribute name and value is its own node so a match can be painted inside it, so they are
  // asserted separately rather than as one `count=` string.
  expect(html).toContain('>count</span>=');
  expect(html).toContain('>lang</span>=');
  expect(html).toContain('>en</span>');
});

test('a search opens the elements holding a match and paints the run', () => {
  const source =
    '<feed><item id="a"><title>needle here</title></item><item id="b">quiet</item></feed>';
  const html = renderToStaticMarkup(
    <XmlTree
      primitives={domPrimitives}
      source={source}
      matcher={{ pattern: /needle/gi, invalid: false }}
    />
  );

  // Opened down to the hit, and the matched run carries the band.
  expect(html).toContain('needle');
  expect(html).toContain(`background-color:${DARK_THEME.matchHighlight}`);
  // The sibling with no match stays closed, so its text never renders.
  expect(html).not.toContain('quiet');
});

test('a match on an attribute opens nothing on its own', () => {
  const source = '<feed><item id="needle"><title>text</title></item></feed>';
  const html = renderToStaticMarkup(
    <XmlTree
      primitives={domPrimitives}
      source={source}
      matcher={{ pattern: /needle/gi, invalid: false }}
    />
  );

  // The attribute is painted where it sits, but an element matching on its own attributes says
  // nothing about whether its contents are worth unfolding — so `title` stays folded.
  expect(html).toContain(`background-color:${DARK_THEME.matchHighlight}`);
  expect(html).not.toContain('text');
});

test('no matcher leaves the default expansion alone', () => {
  const html = renderToStaticMarkup(
    <XmlTree primitives={domPrimitives} source="<feed><item>one</item></feed>" />
  );
  expect(html).not.toContain(`background-color:${DARK_THEME.matchHighlight}`);
  expect(html).toContain('&lt;item');
  expect(html).not.toContain('one');
});
