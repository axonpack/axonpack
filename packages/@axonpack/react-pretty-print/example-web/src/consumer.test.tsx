import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

// Imported by package name, not by relative path — that is the whole point. This resolves through
// the `exports` map to the compiled `build/`, exactly as an npm consumer does, and it is the only
// check that sees the react copy the package resolves. Two reacts in one bundle make every hook
// throw `Cannot read properties of null (reading 'useMemo')`, which no typecheck or src-relative
// test can catch.
import { domPrimitives, JsonTree } from '@axonpack/react-pretty-print';

import { sampleData } from './sample-data';

test('the published package renders under the example own react', () => {
  const html = renderToStaticMarkup(
    <JsonTree primitives={domPrimitives} value={sampleData} rootLabel="response" />
  );

  expect(html).toContain('response');
  expect(html).toContain('user');
  // The 23-element array is bucketed, not flattened.
  expect(html).toContain('events');
});
