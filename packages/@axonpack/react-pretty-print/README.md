# @axonpack/react-pretty-print

Collapsible JSON and XML trees and a syntax highlighter for **React and React Native from one
implementation**. You pass the container, text and pressable components in; the package owns the
logic — expansion state, array chunking, collapsed-node previews, an XML parser, a 38-language
tokenizer and 130 palettes.

No dependencies. Nothing in it imports `react-native` or touches the DOM, so a web project installs
nothing but React and configures no bundler alias, and a React Native project passes its own
components straight in with no adapter to write.

## Getting started

```sh
npm install @axonpack/react-pretty-print
# or: bun add @axonpack/react-pretty-print
```

React 18 or newer is a peer dependency. There is no native module, so no `pod install` and no
prebuild — it runs in Expo Go.

## Usage

On the web, `domPrimitives` ships with the package:

```tsx
import { CodeHighlight, JsonTree, XmlTree, domPrimitives } from '@axonpack/react-pretty-print';
import { LIGHT_THEME } from '@axonpack/react-pretty-print/themes';

const Example = () => (
  <>
    <JsonTree primitives={domPrimitives} value={response} theme={LIGHT_THEME} />
    <XmlTree primitives={domPrimitives} source={feed} theme={LIGHT_THEME} />
    <CodeHighlight
      primitives={domPrimitives}
      code={src}
      language="typescript"
      theme={LIGHT_THEME}
    />
  </>
);
```

On React Native, react-native's own components satisfy the contract as-is:

```tsx
import { Pressable, Text, View } from 'react-native';
import { JsonTree } from '@axonpack/react-pretty-print';

const Example = () => <JsonTree primitives={{ View, Text, Pressable }} value={response} />;
```

See `example-web/` and `example-native/` for both, including the context menu, a theme picker and a
language picker.

---

## `<JsonTree />`

A value as a tree that expands and collapses, with a preview on every closed node.

### primitives

Required. `{ View, Text, Pressable }` — see [Primitives](#primitives).

### value

Required. A `JsonValue`: a string, number, boolean, `null`, an array of those, or an object of them.
Parse a response body before handing it over; this renders a value, it does not accept text.

### rootLabel

Optional. A label for the root row, e.g. `"response"`. Omitted, the root renders as its own preview
with no key.

### theme

Optional, defaults to `DARK_THEME`. Any `PrettyPrintTheme` — see [Themes](#themes).

### defaultExpanded

Optional, default `true`. Whether the root starts open. Its children always start closed: a
hundred-entry payload opened all the way is a wall.

### onCopy

Optional. `(text: string) => void`. The clipboard is platform-specific — react-native's is a
separate install, the web's is on `navigator` — so the package takes a function. **Without it, the
copy actions are not offered at all.** Pass `Clipboard.setStringAsync` or
`navigator.clipboard.writeText`.

### onRequestMenu

Optional. `(items: MenuItem[], event: unknown) => void`, fired on long-press (React Native) or
right-click (web). Enables the gesture; without it, no menu is requested. See
[The context menu](#the-context-menu).

### matcher

Optional. A `Matcher` — see [Search](#search). Drives highlighting **and** expansion: the branches
holding a match open, everything else collapses.

---

## `<XmlTree />`

A document as a tree. Elements expand and collapse; text and character data are leaves.

### primitives

Required. As above.

### source

Required. The raw XML as a string. Parsed in JS, because React Native has no `DOMParser`. A document
that will not parse renders a one-line reason instead — it never throws, so keep the raw text around
to show alongside it.

### theme

Optional, defaults to `DARK_THEME`.

### matcher

Optional. A `Matcher` — see [Search](#search). Matches element names, attribute names, attribute
values, text and character data. An element opens only for a match _inside_ it: one matching on its
own name or attributes is painted where it sits, since that says nothing about whether its contents
are worth unfolding.

---

## `<CodeHighlight />`

Highlighted source, one node per token.

### primitives

Required. As above.

### code

Required. The source as a string.

### language

Required. One of the 38 in [Languages](#languages). Use `detectLanguage()` if you have a content
type rather than a known language.

### theme

Optional, defaults to `DARK_THEME`.

### format

Optional, default `true`. Re-indents minified source before highlighting, which is the difference
between a readable listing and one endless line. It only applies to languages whose structure is
punctuation — see [Languages](#languages) for which — and it is a re-indenter, not a pretty-printer:
it breaks lines on braces, brackets and statement terminators and spaces separators, but it will not
insert a space after a keyword or invent a terminator the source omitted. Turn it off for source you
formatted yourself.

### maxHighlightLength

Optional, defaults to `MAX_HIGHLIGHT_LENGTH` (50,000). Above this many characters the source renders
as one unstyled block — nothing is truncated, only the highlighting is skipped. Raise it if you'd
rather wait, or pass `Infinity` to remove the cap:

```tsx
<CodeHighlight
  primitives={domPrimitives}
  code={bundle}
  language="javascript"
  maxHighlightLength={Infinity}
/>
```

Tokenizing walks the string once per rule per position, so cost grows with length times the size of
the language's rule table — a megabyte of minified source is enough to block the thread. That is the
trade you're making when you raise it.

### matcher

Optional. A `Matcher` — see [Search](#search). Matched runs are painted, including a match that
spans a token boundary: matching happens once over the whole string and the ranges are clipped per
token, so `x=1` highlights across the identifier, the operator and the number.

Nothing here mounts a scroller. A long line needs one, and only you know whether the block is
already inside a `ScrollView` or a container with `overflow-x`.

---

## Primitives

Every renderer takes its components from you. That is what lets one implementation serve both
platforms.

```ts
type Primitives = {
  View: ComponentType<{ style?; children? }>;
  Text: ComponentType<{ style?; children?; selectable? }>;
  Pressable: ComponentType<{ style?; children?; onPress?; onLongPress? }>;
};
```

| Platform     | What to pass                                                                 |
| ------------ | ---------------------------------------------------------------------------- |
| React Native | `{ View, Text, Pressable }` imported from `react-native` — no wrapper needed |
| The DOM      | `domPrimitives`, exported from this package                                  |

`selectable` exists for React Native only, where text is unselectable by default and a code block
you cannot copy from is useless; `domPrimitives` drops it rather than forwarding an unknown
attribute to a `<span>`.

The style types are deliberately loose: React Native's `StyleProp<ViewStyle>` and React's
`CSSProperties` are not assignable to each other in either direction, so one concrete type would
reject a platform outright. The long-press event is `unknown` and passed through untouched for the
same reason — anything narrower fails contravariance and would force every React Native consumer to
write a wrapper.

A custom set is a few lines. Anything that accepts a style object and renders children will do.

## The context menu

The package computes **which actions apply to a node and what each does to the expansion state**;
you render the popover. It cannot ship one: a floating menu has to escape its scroll container,
which needs a `Modal` on React Native and a portal or `position: fixed` on the DOM — React Native
has no portal and the DOM has no modal, so there is no shared subset to write against.

```tsx
const [menu, setMenu] = useState<{ items: MenuItem[]; x: number; y: number } | null>(null);

<JsonTree
  primitives={{ View, Text, Pressable }}
  value={response}
  onCopy={Clipboard.setStringAsync}
  onRequestMenu={(items, event) => {
    const { pageX, pageY } = (event as GestureResponderEvent).nativeEvent;
    setMenu({ items, x: pageX, y: pageY });
  }}
/>;
```

`MenuItem` is `{ label: string; onSelect: () => void; copyText?: string }`. Render the labels and
call `onSelect` on press. A copy item also carries `copyText`, the text it copies, for a host that has to
do the copying somewhere `onSelect` does not run. The items offered depend on the node: _Copy value_ or _Copy object_ when `onCopy` is set,
plus _Expand_ / _Collapse_, _Expand recursively_ and _Collapse recursively_ on a container that has
children.

`event` is `unknown` because the package never reads it. Cast it at this one call site:
`nativeEvent.pageX` on React Native, `clientX` on a DOM mouse event.

`example-native/components/ContextMenu.tsx` and `example-web/src/components/ContextMenu.tsx` are
working implementations of each — copy one.

## Search

All three renderers take a `matcher`, which is plain data rather than a callback:

```ts
type Matcher = { pattern: RegExp | null; invalid: boolean };
```

That shape is the contract. If your app already compiles a matcher for its own list filtering, pass
it straight in — TypeScript matches structurally, so there is nothing to import and nothing to
convert. If you don't have one, `buildMatcher` compiles a query:

```tsx
import { buildMatcher, DEFAULT_SEARCH_MODES } from '@axonpack/react-pretty-print';

const matcher = buildMatcher({ text: query, ...DEFAULT_SEARCH_MODES, matchCase: false });

<JsonTree primitives={domPrimitives} value={data} matcher={matcher} theme={theme} />;
```

`SearchModes` are `matchCase`, `wholeWord` and `regex`. Two behaviours worth knowing:

- **An uncompilable pattern is no search, not no results.** A half-typed regex gives
  `{ pattern: null, invalid: true }`, and the tree keeps its normal expansion rather than collapsing
  to nothing. Read `invalid` if you want to mark the input.
- **A closed node still previews its contents.** The search walk looks at the leaves underneath it,
  so a branch with a match opens; a branch without one stays closed and shows its preview as usual.

The band's colour is the `matchHighlight` token, translucent so the matched text keeps its syntax
colour. `findMatches`, `clipMatches`, `splitByMatches` and `testMatch` are exported for building
your own row filters against the same matcher.

Both examples have a search bar at the top with the three mode toggles wired up —
`example-web/src/components/SearchBar.tsx` and `example-native/components/SearchBar.tsx` — including
the invalid-pattern state.

## Themes

A palette is a flat set of colour roles, never a stylesheet, so nothing has to be translated between
platforms.

```ts
import { AZURE_DARK_VIVID_THEME, DARK_THEME } from '@axonpack/react-pretty-print/themes';
import type { PrettyPrintTheme } from '@axonpack/react-pretty-print/themes';
```

They are a **separate entry point** on purpose: 130 palettes is ~52KB, and a project that only wants
a renderer shouldn't pull them into its module graph to find out it didn't need them.

| Token                     | Paints                                                                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `background`              | The surface the palette was designed against. **No renderer draws it** — you own your container — but it is stated so you know what you were handed. |
| `text`                    | Unclassified code text                                                                                                                               |
| `key`                     | JSON keys, XML element names                                                                                                                         |
| `string`                  | Quoted strings, XML attribute values                                                                                                                 |
| `number` / `boolean`      | Literals. They share a colour in every shipped palette: painting `2` and `true` differently is noise.                                                |
| `null`                    | An absent value                                                                                                                                      |
| `punctuation`             | Braces, separators, collapsed-node previews                                                                                                          |
| `toggle`                  | The expand arrow                                                                                                                                     |
| `keyword`                 | Language keywords                                                                                                                                    |
| `comment`                 | Comments                                                                                                                                             |
| `accent`                  | Function names, CSS properties, attribute names                                                                                                      |
| `tag`                     | Markup tags, CSS selectors                                                                                                                           |
| `fontFamily` / `fontSize` | Type. Monospace at 12 in every shipped palette.                                                                                                      |

`DARK_THEME` and `LIGHT_THEME` are the neutral pair the renderers default to — the only palettes
with no hue cast. The other 128 are named `<hue>_<mode>_<character>_THEME`: 16 hues (`crimson`,
`amber`, `gold`, `citron`, `lime`, `emerald`, `jade`, `teal`, `cyan`, `azure`, `cobalt`, `sapphire`,
`indigo`, `violet`, `magenta`, `rose`) × `dark`/`light` × four characters — `muted`, `vivid`, `soft`
and `crisp`.

Every palette clears a WCAG contrast ratio against its own background: 4.5:1 for body text, 7:1 on
`crisp`, never below 3:1 for any token. Writing your own is a plain object; the shipped set's
construction rules are in `src/themes/palettes.const.ts`'s header.

### The monospace font on React Native

Every shipped palette says `fontFamily: 'monospace'`. That is correct on the web and on Android, and
**wrong on iOS**: `monospace` is an Android family name, iOS finds no font by it, and it falls back
to the proportional system font without warning — which stays invisible until something has to line
up. Nothing here can call `Platform.select`, because importing a platform is the one thing this
design rules out, so override the token:

```tsx
import { Platform } from 'react-native';
import { DARK_THEME } from '@axonpack/react-pretty-print/themes';

const MONOSPACE = Platform.select({ ios: 'Menlo', default: 'monospace' });
const theme = { ...DARK_THEME, fontFamily: MONOSPACE };
```

It has to be a single family name, not a CSS stack: React Native looks the string up verbatim, so
`"Menlo, monospace"` matches nothing on either platform. `Menlo` ships with every iOS.
`example-native/fonts.ts` is this, and nothing on the DOM needs it.

## Languages

38, exported as `SUPPORTED_LANGUAGES`.

| Group                 | Languages                                                                                                              | `format` re-indents |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Braces, `//`, `/* */` | `javascript` `typescript` `tsx` `java` `kotlin` `swift` `go` `rust` `c` `cpp` `csharp` `php` `dart` `scala` `protobuf` | yes                 |
| `#` comments          | `python` `ruby` `bash` `dockerfile` `makefile` `graphql`                                                               | `graphql` only      |
| Key/value             | `json` `json5` `yaml` `toml` `ini` `properties`                                                                        | `json` and `json5`  |
| Angle brackets        | `html` `xml` `svg` `markdown`                                                                                          | no                  |
| Stylesheets           | `css` `scss` `less`                                                                                                    | yes                 |
| Line-oriented         | `sql` `diff` `log`                                                                                                     | `sql` only          |
| Unstyled              | `plain`                                                                                                                | no                  |

Indentation-sensitive and line-oriented formats are excluded from `format` deliberately: `python`
and `yaml` carry meaning in the whitespace they already have, markup and markdown have their own
shape, and a diff or a log is already one record per line.

## Utilities

Everything the renderers use is exported, so a caller that wants its own rendering can take the
parsed output and skip the components.

| Export                   | Signature                                                       | Notes                                                                                                            |
| ------------------------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `detectLanguage`         | `(mimeType: string \| undefined, body: string) => Language`     | Reads the content type, then sniffs the body. Use it when a server labels everything `text/plain`.               |
| `tokenize`               | `(code: string, language: Language) => Token[]`                 | `{ type, text }` per token; concatenating `text` returns the input unchanged. This is the renderer escape hatch. |
| `formatCode`             | `(code: string, language: Language) => string`                  | Re-indents, or returns the input for a language it does not format.                                              |
| `SUPPORTED_LANGUAGES`    | `Language[]`                                                    | Sorted.                                                                                                          |
| `MAX_HIGHLIGHT_LENGTH`   | `50_000`                                                        | Above this `CodeHighlight` renders unhighlighted rather than blocking.                                           |
| `parseXml`               | `(source: string) => { root: XmlElement } \| { error: string }` | Never throws.                                                                                                    |
| `isExpandable`           | `(value: JsonValue) => boolean`                                 | True for any object or array.                                                                                    |
| `hasChildren`            | `(value: JsonValue) => boolean`                                 | False for `{}` and `[]`, which is why they get no toggle.                                                        |
| `isPlainObject`          | `(value: JsonValue) => boolean`                                 | `null` is not one.                                                                                               |
| `buildPreview`           | `(value: object \| array) => string`                            | The summary a closed node shows.                                                                                 |
| `chunkArrayRange`        | `(length: number) => [number, number][]`                        | The bucket boundaries for a long array.                                                                          |
| `collectExpandablePaths` | `(path: string, value: JsonValue) => string[]`                  | Every path under a node, for expanding a subtree.                                                                |
| `formatCopyValue`        | `(value: JsonValue) => string`                                  | `JSON.stringify` at two spaces.                                                                                  |
| `ARRAY_CHUNK_SIZE`       | `10`                                                            | Arrays longer than this are bucketed.                                                                            |

## Types

`JsonValue`, `Language`, `Token`, `TokenType`, `MenuItem`, `Matcher`, `MatchRange`, `SearchModes`,
`SearchQuery`, `TextSegment`, `Primitives`, `JsonTreeProps`,
`XmlTreeProps`, `CodeHighlightProps`, `XmlNode`, `XmlElement`, `XmlText`, `XmlCData`,
`XmlParseResult` from the root; `PrettyPrintTheme` from `/themes`.

`TokenType` is one of `keyword`, `string`, `comment`, `number`, `function`, `tag`, `attr-name`,
`attr-value`, `property`, `selector`, `punctuation`, `plain`.

## What's built, and what isn't

[The notes](./notes/README.md) — one per area, each owning its own feature list, what is not built
yet, and what the platforms make impossible, along with the design decisions behind it:
[Primitives](./notes/primitives.md) · [JSON](./notes/json.md) · [XML](./notes/xml.md) ·
[Code](./notes/code.md) · [Themes](./notes/themes.md).

## License

MIT © [Md Asadujjaman](https://github.com/abappi19).
