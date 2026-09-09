import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { JsonTree } from './json-tree.component';
import { domPrimitives } from '../shared/primitives.ui';

const value = { users: [{ name: 'ada' }], ok: true, nil: null, count: 2 };

/** The whole premise of `domPrimitives`: a web consumer renders with react alone. */
test('renders on the DOM with no react-native in the graph', () => {
  const html = renderToStaticMarkup(<JsonTree primitives={domPrimitives} value={value} />);

  expect(html).toContain('users');
  expect(html).toContain('count');
  // Root open by default, children collapsed to previews.
  expect(html).toContain('[…]');
  expect(html).not.toContain('ada');
  // Styles reached the DOM as CSS, not as an RN registry id.
  expect(html).toContain('font-family:monospace');
  expect(html).toContain('margin-left:14px');
});

test('empty containers get no toggle', () => {
  const html = renderToStaticMarkup(
    <JsonTree primitives={domPrimitives} value={{ empty: {}, nothing: [], full: { a: 1 } }} />
  );

  // Three container children, but only `full` can be opened.
  expect(html.match(/▸/g)).toHaveLength(1);
  expect(html).toContain('{}');
  expect(html).toContain('[]');
});

test('rows lay out as flex on the DOM, where a div is display:block by default', () => {
  const html = renderToStaticMarkup(<JsonTree primitives={domPrimitives} value={value} />);

  // Without `display:flex` a div ignores `flex-direction`, and every toggle stacks above its row.
  expect(html).toContain('display:flex;flex-direction:row');
  // The toggle column states both defaults RN and CSS disagree on.
  expect(html).toContain('display:flex;flex-direction:column');
  expect(html).toContain('flex-shrink:0');
});

test('a row is at least the tap floor tall, since every row toggles', () => {
  const html = renderToStaticMarkup(<JsonTree primitives={domPrimitives} value={value} />);

  const heights = [...html.matchAll(/min-height:(\d+)px/g)].map((m) => Number(m[1]));
  expect(heights.length).toBeGreaterThan(0);
  for (const height of heights) {
    expect(height).toBeGreaterThanOrEqual(28);
  }
});

test('defaultExpanded false collapses the root', () => {
  const html = renderToStaticMarkup(
    <JsonTree primitives={domPrimitives} value={value} defaultExpanded={false} />
  );
  // Only the root row renders, and it renders as its own preview.
  expect(html).toContain('{users: […], ok: true, nil: null, count: 2}');
  expect(html).toContain('▸');
  expect(html).not.toContain('▾');
});
