import * as pretty from '@axonpack/react-pretty-print';
import {
  CodeHighlight,
  DARK_THEME,
  JsonTree,
  XmlTree,
  SUPPORTED_LANGUAGES,
  type Language,
  type MenuItem,
  type PrettyPrintTheme,
} from '@axonpack/react-pretty-print';
import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { ContextMenu, type MenuState } from './components/ContextMenu';
import { Panel } from './components/Panel';
import { LanguagePicker } from './components/LanguagePicker';
import { ThemePicker } from './components/ThemePicker';
import { CODE_SAMPLES, sampleData, sampleXml } from './sample-data';

// react-native's own components satisfy `Primitives` as-is — the point of the injection boundary.
const primitives = { View, Text, Pressable };

/** Every `*_THEME` the package exports, by name. */
const PALETTES = Object.entries(pretty)
  .filter((entry): entry is [string, PrettyPrintTheme] => entry[0].endsWith('_THEME'))
  .sort(([a], [b]) => a.localeCompare(b));

/** Relative luminance, only to decide which status bar style stays legible. */
function isDarkBackground(colour: string): boolean {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(colour.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

export default function App() {
  const [name, setName] = useState('DARK_THEME');
  const [format, setFormat] = useState(true);
  const [language, setLanguage] = useState<Language>('javascript');
  const [menu, setMenu] = useState<MenuState | null>(null);

  // The palette states the surface it was designed against; nothing renders it, so the screen does.
  const theme = PALETTES.find(([key]) => key === name)?.[1] ?? DARK_THEME;
  const surface = theme.background;
  const ink = theme.text;

  return (
    <View style={[styles.screen, { backgroundColor: surface }]}>
      <StatusBar style={isDarkBackground(surface) ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: ink }]}>
          @axonpack/react-pretty-print — React Native
        </Text>
        <Text style={[styles.subtitle, { color: ink }]}>
          Tap a row to expand, long-press for the menu.
        </Text>

        <ThemePicker palettes={PALETTES} selected={name} onSelect={setName} />

        <Panel title="JsonTree" theme={theme}>
          <JsonTree
            primitives={primitives}
            value={sampleData}
            rootLabel="response"
            theme={theme}
            onCopy={(text) => Clipboard.setStringAsync(text)}
            onRequestMenu={(items: MenuItem[], event) => {
              // `event` is `unknown` by design — the package never reads it, so the cast is here.
              const { pageX, pageY } = (event as GestureResponderEvent).nativeEvent;
              setMenu({ items, x: pageX, y: pageY });
            }}
          />
        </Panel>

        <Panel title="XmlTree" theme={theme}>
          <XmlTree primitives={primitives} source={sampleXml} theme={theme} />
        </Panel>

        <Pressable
          onPress={() => setFormat((on) => !on)}
          style={[styles.toggle, { borderColor: theme.punctuation }]}>
          <Text style={[styles.toggleText, { color: ink }]}>
            {`${format ? '☑' : '☐'}  Re-indent minified source (format)`}
          </Text>
        </Pressable>

        <LanguagePicker
          languages={SUPPORTED_LANGUAGES}
          selected={language}
          theme={theme}
          onSelect={setLanguage}
        />

        <Panel title={`CodeHighlight — ${language}`} theme={theme} scrollHorizontal>
          <CodeHighlight
            primitives={primitives}
            code={CODE_SAMPLES[language]}
            language={language}
            theme={theme}
            format={format}
          />
        </Panel>
      </ScrollView>
      <ContextMenu menu={menu} onClose={() => setMenu(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingTop: 64 },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 12, opacity: 0.7, marginBottom: 12 },
  toggle: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 16,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toggleText: { fontSize: 12 },
});
