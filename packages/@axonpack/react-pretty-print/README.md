# @axonpack/react-pretty-print

JSON tree, XML tree and syntax highlighter for **React and React Native from one implementation**.
You pass in the `View`, `Text` and `Pressable` components; the package owns the logic — expansion
state, array chunking, collapsed-node previews, path identity, context-menu items, an XML parser and
a tokenizer.

| Component       | For                               | Interactive                   |
| --------------- | --------------------------------- | ----------------------------- |
| `JsonTree`      | a `JsonValue`                     | expand/collapse, context menu |
| `XmlTree`       | an XML string                     | expand/collapse               |
| `CodeHighlight` | javascript / css / markup / plain | no                            |

`detectLanguage(mimeType, body)` picks a `language` from a content type, falling back to sniffing
the body. `parseXml` and `tokenize` are exported too, so a consumer that wants its own rendering
gets the parsed output and skips the components — that is the `renderer` escape hatch other
highlighters need a prop for.

## Web

`domPrimitives` ships with the package, so a web project needs nothing but React:

```tsx
import { JsonTree, domPrimitives } from '@axonpack/react-pretty-print';
import { LIGHT_THEME } from '@axonpack/react-pretty-print/themes';

<JsonTree primitives={domPrimitives} value={data} theme={LIGHT_THEME} />;
<XmlTree primitives={domPrimitives} source={xml} />;
<CodeHighlight primitives={domPrimitives} code={source} language="javascript" />;
```

## React Native

No adapter — react-native's own components satisfy the contract as-is:

```tsx
import { Pressable, Text, View } from 'react-native';
import { JsonTree } from '@axonpack/react-pretty-print';

<JsonTree primitives={{ View, Text, Pressable }} value={data} />;
```

## The context menu is yours to render

Long-press (RN) or right-click (web) fires `onRequestMenu` with the items that apply to the node
and the **untouched** platform event. The package deliberately does not render the popover: RN wants
a `Modal` + `useWindowDimensions`, the DOM wants a portal + `position: fixed`, and there is no
shared subset. The items — which apply, and what each one does to expansion state — are the part
worth sharing, and that is what you get.

```tsx
const [menu, setMenu] = useState<{ items: MenuItem[]; x: number; y: number } | null>(null);

<JsonTree
  primitives={{ View, Text, Pressable }}
  value={data}
  onCopy={Clipboard.setStringAsync}
  onRequestMenu={(items, event) => {
    const { pageX, pageY } = (event as GestureResponderEvent).nativeEvent;
    setMenu({ items, x: pageX, y: pageY });
  }}
/>;
```

`event` is `unknown` because the package never reads it — cast it to your platform's event type at
this one call site. `onCopy` is likewise yours (`expo-clipboard` vs `navigator.clipboard`); omit it
and the copy items aren't offered.

## Props

| Prop              | Default      | Notes                                         |
| ----------------- | ------------ | --------------------------------------------- |
| `primitives`      | —            | `{ View, Text, Pressable }`                   |
| `value`           | —            | `JsonValue`                                   |
| `rootLabel`       | none         | Label for the root row                        |
| `theme`           | `DARK_THEME` | Also `LIGHT_THEME`, or any `PrettyPrintTheme` |
| `defaultExpanded` | `true`       | Whether the root starts open                  |
| `onCopy`          | none         | Enables the copy menu items                   |
| `onRequestMenu`   | none         | Enables the long-press/right-click gesture    |

## Examples

Two apps, one package, no shared UI code — run them side by side:

```bash
bun run build                        # example-web resolves the published `build/`
cd example-web    && bun run dev     # plain React + react-dom, no bundler config
cd example-native && bun run start   # Expo Go
```

`react` is pinned to one exact version across the package and both examples. It has to be: a
workspace can otherwise link a second copy, and a bundle holding two reacts makes every hook throw
`Cannot read properties of null (reading 'useMemo')`. `example-web/src/consumer.test.tsx` imports
the package **by name** and server-renders it, which is the only check that sees the react copy the
package resolves — a typecheck and a src-relative test both pass while it is broken. (This is a
workspace-linking hazard only; a published install has just the consumer's react.)

`example-web` deliberately has no tsconfig `paths` shortcut, so it resolves the package through its
`exports` exactly as an npm consumer does — it is the only check in this repo that the published
shape is correct, and it fails if `build/` is missing. `example-native` resolves the `expo-source`
condition to `src`, so Metro picks up edits with no rebuild. The two `ContextMenu.tsx` files are the
whole cross-platform story: same `items` array from `onRequestMenu`, one rendered as an RN `Modal`,
the other as a fixed-position `div`.

## Layout

Layer first, domain second, and every folder has an `index.ts`. Two entry points:
`@axonpack/react-pretty-print` for the renderers and the pure logic, and
`@axonpack/react-pretty-print/themes` for the palettes.

```
src/
  components/  json/  xml/  code/  shared/   <- shared/ holds the injected primitives
  utils/       json/  xml/  code/  shared/   <- shared/ holds the tree styles
  themes/                                    <- the token contract and all 130 palettes
  index.ts
```

`themes/` sits beside the layers rather than inside one: a palette is the package's public
vocabulary, not a constant that belongs to a renderer, and every layer reads it. `theme.const.ts`
declares the token contract and `palettes.const.ts` holds every palette — see **Palettes** below.

The per-layer and per-domain barrels are mechanical and expose everything beside them. `src/index.ts`
is curated instead, because the node renderers and the style builders are internal — and because a
starred re-export of both `./components` and `./utils` would collide, `XmlNode` being a renderer in
one and the parsed-node type in the other. `src/index.test.ts` pins the published surface so a
barrel can't leak or drop an export unnoticed.

Tests sit beside what they test. `*.util.ts` is pure and platform-free; `*.component.tsx` renders
through the injected primitives and imports no platform package.

## Styling constraint

Every style has to mean the same thing to RN's layout engine and to CSS, and the traps are
**differing defaults**, not differing property names. `buildTreeStyles` is the only place this
matters, and it states all of them explicitly:

|                 | React Native  | CSS                                                           |
| --------------- | ------------- | ------------------------------------------------------------- |
| `display`       | always `flex` | `block` on a `div` — so `flexDirection` is inert until stated |
| `flexDirection` | `column`      | `row`                                                         |
| `flexShrink`    | `0`           | `1` — a fixed-width child shrinks away without it             |

Longhand properties only, for the same reason: RN understands `paddingVertical` and CSS doesn't.

## Palettes

130, all in `src/themes/palettes.const.ts`, all plain `PrettyPrintTheme` objects named `*_THEME`.
`DARK_THEME` and `LIGHT_THEME` come first and are what the renderers default to: they are the only
achromatic pair, since every other palette is tinted toward its base hue.

They are their own entry point rather than part of the root barrel — 130 palettes is ~52KB, and a
consumer that only wants a renderer shouldn't pull that in to find out it didn't need it.
`PrettyPrintTheme` lives there too, and a bundler still drops whichever palettes you don't name.

```ts
import type { PrettyPrintTheme } from '@axonpack/react-pretty-print/themes';
import { AZURE_DARK_VIVID_THEME, DARK_THEME } from '@axonpack/react-pretty-print/themes';
```

The set is named `<hue>_<mode>_<character>_THEME` — 16 hues x dark/light x four characters
(`muted`, `vivid`, `soft`, `crisp`). Both examples list every one in a picker whose chips are
painted in the palette they select, so the strip previews the whole set.

The file is ordinary source: edit a colour if you want to. Its header carries the construction rules — the hue table, what each character means, the role offsets — so a
hand-written addition matches the rest. **The guarantee lives in the tests, not in how the file was
first written.** Every colour clears a WCAG ratio against its own background: 4.5:1 for body text,
7:1 on `crisp`, never below 3:1 for any token. `src/themes/themes.test.ts` asserts that across all
130 — roughly 4,000 assertions, and the reason the set can be this large without a palette in it
being unreadable. It also asserts keys never match strings, and that a hue-named palette really is
that hue.

Two details worth knowing before you tune one:

- **Role hues sit at least 40 degrees apart** so no two read as the same colour. `boolean`
  deliberately shares `number`'s: both are literals, and painting `2` and `true` differently is
  noise rather than information.
- **`punctuation`, `toggle` and `null` share one muted tone** — the palette's own text pulled toward
  its own background, far enough to stay recessive but not so far it drops under 3:1.

`background` is stated by every palette but painted by no renderer: the caller owns its container.
Both examples read `theme.background` for the page and `theme.punctuation` for panel borders.

## Languages

38, exported as `SUPPORTED_LANGUAGES`. `detectLanguage(mimeType, body)` picks one from a content
type, falling back to sniffing the body — which is the common case, since plenty of servers label
everything `text/plain`.

| Family                | Languages                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------- |
| braces, `//`, `/* */` | javascript typescript tsx java kotlin swift go rust c cpp csharp php dart scala protobuf |
| `#` comments          | python ruby bash dockerfile makefile graphql                                             |
| key/value             | yaml toml ini properties json json5                                                      |
| angle brackets        | html xml svg markdown                                                                    |
| stylesheets           | css scss less                                                                            |
| line-oriented         | sql diff log                                                                             |
| none                  | plain                                                                                    |

The families are the point: fifteen of those differ only in their keyword list, so `braceFamily()`
takes a vocabulary and returns a rule table. Adding a language is a keyword list in
`languages.const.ts` plus one line in `LANGUAGE_RULES` — and a sample in the test, which asserts for
every language that nothing is dropped and that the rule table actually fires. A table matching
nothing still renders; it just renders unstyled, which is easy to miss by eye across this many.

`formatCode` covers only the brace-and-semicolon languages plus json and the stylesheets. Everything
else is excluded on purpose and asserted to pass through untouched: python and yaml carry meaning in
their existing indentation, markup and markdown have their own shape, and the line-oriented formats
are already one record per line.

## Why the highlighter is its own tokenizer

It is a longest-prefix-wins rule list with no dependencies. A general highlighting engine would
bring hundreds of languages, and with them a theme format shaped for CSS that has to be translated
into RN styles at runtime: `em` units to numbers, `background` to `backgroundColor`, and a list of
properties to drop because RN has no equivalent. That translation layer is where the cost and the
edge cases live.

Themes here are a token-role map (`PrettyPrintTheme`) rather than a stylesheet, so there is nothing
to translate and each renderer turns roles into its own styles.

## Not here yet

- **Line numbers.** A gutter column beside `CodeHighlight`.
- **Search.** Driving expansion from a match — opening exactly the branches that hold one, and
  painting the matched range inside a token. The matcher is the missing piece, not the tree.
- **A flat, non-interactive code dump** as an alternative to the tree for JSON.
- **Non-JSON values.** `JsonValue` is the strict JSON union; `undefined`, functions and symbols
  render as `null`. Widening to `unknown` is what a store inspector would need.
