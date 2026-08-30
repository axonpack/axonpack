import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { XmlTree } from './xml-tree.component';
import { domPrimitives } from '../shared/primitives.ui';

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
  expect(html).toContain('count=');
  expect(html).toContain('lang=');
});
