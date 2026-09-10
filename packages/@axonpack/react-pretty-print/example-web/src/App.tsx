import { useMemo, useState } from 'react';
import * as themes from '@axonpack/react-pretty-print/themes';
import {
  CodeHighlight,
  domPrimitives,
  JsonTree,
  XmlTree,
  buildMatcher,
  DEFAULT_SEARCH_MODES,
  SUPPORTED_LANGUAGES,
  type Language,
  type MenuItem,
  type SearchQuery,
} from '@axonpack/react-pretty-print';
import { DARK_THEME, type PrettyPrintTheme } from '@axonpack/react-pretty-print/themes';

import { ContextMenu, type MenuState } from './components/ContextMenu';
import { Panel } from './components/Panel';
import { SearchBar } from './components/SearchBar';
import { LanguagePicker } from './components/LanguagePicker';
import { ThemePicker } from './components/ThemePicker';
import { CODE_SAMPLES, sampleData, sampleXml } from './sample-data';

/** Every palette the `/themes` entry point exports, by name. */
const PALETTES = Object.entries(themes)
  .filter((entry): entry is [string, PrettyPrintTheme] => entry[0].endsWith('_THEME'))
  .sort(([a], [b]) => a.localeCompare(b));

export function App() {
  const [name, setName] = useState('DARK_THEME');
  const [format, setFormat] = useState(true);
  const [language, setLanguage] = useState<Language>('javascript');
  const [query, setQuery] = useState<SearchQuery>({ text: '', ...DEFAULT_SEARCH_MODES });

  // Keyed on the query object, so the matcher's identity only changes when the search does — which
  // is what the tree keys its expansion on. Recompiling per render would reset it on every keystroke.
  const matcher = useMemo(() => buildMatcher(query), [query]);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // The palette states the surface it was designed against; nothing renders it, so the page does.
  const theme = PALETTES.find(([key]) => key === name)?.[1] ?? DARK_THEME;

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 24,
        background: theme.background,
        color: theme.text,
        fontFamily: 'system-ui, sans-serif',
      }}>
      <h1 style={{ fontSize: 18, margin: '0 0 4px' }}>@axonpack/react-pretty-print — React</h1>
      <p style={{ fontSize: 13, opacity: 0.7, margin: '0 0 16px' }}>
        Plain React and react-dom. No react-native-web, no bundler alias. Click a row to expand,
        right-click for the menu.
      </p>

      <SearchBar
        query={query}
        invalid={matcher?.invalid ?? false}
        theme={theme}
        onChange={setQuery}
      />

      <ThemePicker palettes={PALETTES} selected={name} onSelect={setName} />
      {copied !== null && (
        <span style={{ marginLeft: 12, fontSize: 12, opacity: 0.7 }}>
          Copied {copied.length} chars
        </span>
      )}

      <Panel title="JsonTree" theme={theme}>
        <JsonTree
          primitives={domPrimitives}
          value={sampleData}
          rootLabel="response"
          theme={theme}
          matcher={matcher}
          onCopy={(copiedText) => {
            navigator.clipboard.writeText(copiedText);
            setCopied(copiedText);
          }}
          onRequestMenu={(items: MenuItem[], event) => {
            // `event` is `unknown` by design — the package never reads it, so the cast lives here.
            const mouse = event as React.MouseEvent;
            setMenu({ items, x: mouse.clientX, y: mouse.clientY });
          }}
        />
      </Panel>

      <Panel title="XmlTree" theme={theme}>
        <XmlTree primitives={domPrimitives} source={sampleXml} theme={theme} matcher={matcher} />
      </Panel>

      <label style={{ display: 'block', fontSize: 13, margin: '0 0 12px' }}>
        <input
          type="checkbox"
          checked={format}
          onChange={(event) => setFormat(event.target.checked)}
        />{' '}
        Re-indent minified source (<code>format</code>)
      </label>

      <LanguagePicker
        languages={SUPPORTED_LANGUAGES}
        selected={language}
        theme={theme}
        onSelect={setLanguage}
      />

      <Panel title={`CodeHighlight — ${language}`} theme={theme}>
        <CodeHighlight
          primitives={domPrimitives}
          code={CODE_SAMPLES[language]}
          language={language}
          theme={theme}
          format={format}
          matcher={matcher}
        />
      </Panel>

      <ContextMenu menu={menu} onClose={() => setMenu(null)} />
    </main>
  );
}
