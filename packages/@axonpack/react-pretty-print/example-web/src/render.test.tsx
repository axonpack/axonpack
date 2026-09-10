import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { SUPPORTED_LANGUAGES } from '@axonpack/react-pretty-print';
import * as themes from '@axonpack/react-pretty-print/themes';
import type { PrettyPrintTheme } from '@axonpack/react-pretty-print/themes';

import { App } from './App';
import { LanguagePicker } from './components/LanguagePicker';
import { Panel } from './components/Panel';
import { ThemePicker } from './components/ThemePicker';

const PALETTES = Object.entries(themes).filter((entry): entry is [string, PrettyPrintTheme] =>
  entry[0].endsWith('_THEME')
);

/**
 * A smoke test with real teeth: `App` mounts every renderer, both pickers and four panels at once,
 * so anything that throws on render fails here. The examples are how the package is looked at, and
 * an example that crashes is not something a screenshot will tell you about later.
 */
test('the whole example renders', () => {
  const html = renderToStaticMarkup(<App />);

  expect(html).toContain('JsonTree');
  expect(html).toContain('XmlTree');
  expect(html).toContain('CodeHighlight');
  // The default palette and language it starts on.
  expect(html).toContain(themes.DARK_THEME.background);
  expect(html).toContain('javascript');
});

test('the theme picker offers every palette, each painted in itself', () => {
  const html = renderToStaticMarkup(
    <ThemePicker palettes={PALETTES} selected="DARK_THEME" onSelect={() => {}} />
  );

  expect(PALETTES).toHaveLength(130);
  for (const [, palette] of PALETTES) {
    // A chip painted in the palette it selects is the only reason the strip is useful.
    expect(html).toContain(`background:${palette.background}`);
  }
  // The selection is marked with the palette's own key colour, not a fixed accent.
  expect(html).toContain(`2px solid ${themes.DARK_THEME.key}`);
});

test('the language picker offers every supported language', () => {
  const html = renderToStaticMarkup(
    <LanguagePicker
      languages={SUPPORTED_LANGUAGES}
      selected="javascript"
      theme={themes.DARK_THEME}
      onSelect={() => {}}
    />
  );

  for (const language of SUPPORTED_LANGUAGES) {
    expect(html, language).toContain(`>${language}</button>`);
  }
});

test('a panel carries its title and the palette border', () => {
  const html = renderToStaticMarkup(
    <Panel title="JsonTree" theme={themes.LIGHT_THEME}>
      <span>body</span>
    </Panel>
  );

  expect(html).toContain('JsonTree');
  expect(html).toContain(themes.LIGHT_THEME.punctuation);
  expect(html).toContain('<span>body</span>');
});
