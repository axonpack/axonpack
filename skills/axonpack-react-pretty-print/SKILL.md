---
name: axonpack-react-pretty-print
description: Set up @axonpack/react-pretty-print and render collapsible JSON and XML trees and syntax-highlighted code in React or React Native, from one implementation. Use when the project depends on @axonpack/react-pretty-print, or when the user wants a JSON viewer, an XML tree, a code block with highlighting (38 languages), search highlighting inside a tree, a copy or expand context menu, or one of 130 colour themes, on the web, in Expo or in React Native.
---

# @axonpack/react-pretty-print

Three renderers, `<JsonTree />`, `<XmlTree />` and `<CodeHighlight />`, that work on the web and in
React Native from one implementation. You pass in the `View`, `Text` and `Pressable` components to
draw with. No dependencies, no native module, and it runs in Expo Go.

## Set it up

Do the steps in order. Each ends with a check; don't go on until it passes.

1. **Find the package manager.** Look for a lockfile in the app's folder, or the nearest parent
   folder that has one. Use that manager and never add a second lockfile.

   | Lockfile                | Manager | Add                                        |
   | ----------------------- | ------- | ------------------------------------------ |
   | `package-lock.json`     | npm     | `npm install @axonpack/react-pretty-print` |
   | `yarn.lock`             | yarn    | `yarn add @axonpack/react-pretty-print`    |
   | `pnpm-lock.yaml`        | pnpm    | `pnpm add @axonpack/react-pretty-print`    |
   | `bun.lock`, `bun.lockb` | bun     | `bun add @axonpack/react-pretty-print`     |

   No lockfile at all: ask the user which one they use.

2. **Check the version.** `react` 18 or newer is the only requirement.

3. **Install** with the "Add" command. In an Expo app, `npx expo install @axonpack/react-pretty-print`
   (`yarn`, `pnpm exec` or `bunx` in place of `npx`) does the same.
   Check: `package.json` lists it.

4. **Render one.** No config plugin, no Metro or bundler change, no provider. Pick the primitives for
   the platform:

   ```tsx
   // React Native and Expo: React Native's own components
   import { Pressable, Text, View } from "react-native";
   import { JsonTree } from "@axonpack/react-pretty-print";

   <JsonTree
     primitives={{ View, Text, Pressable }}
     value={{ ok: true, items: [1, 2] }}
   />;
   ```

   ```tsx
   // Web: the DOM primitives the package ships
   import { JsonTree, domPrimitives } from "@axonpack/react-pretty-print";

   <JsonTree primitives={domPrimitives} value={{ ok: true, items: [1, 2] }} />;
   ```

   On iOS, set a monospace font that exists there (see Setup problems).
   Check: `npx tsc --noEmit` (or the project's runner) passes.

5. **Native build: none.** It runs in Expo Go, a development build and on the web as it is.

6. **Verify.** Without a device: the typecheck, and the app's bundle builds
   (`npx expo export --platform ios --output-dir <scratch folder>` in an Expo app, or the web
   build). Delete the output after. On screen, the root is open with `ok: true` and a closed
   `items`; tapping `items` opens it.

## Setup problems

- **A proportional font on iOS.** Every shipped theme says `fontFamily: 'monospace'`, which iOS
  doesn't have. Override it with one family name:

  ```tsx
  import { Platform } from "react-native";
  import { DARK_THEME } from "@axonpack/react-pretty-print/themes";

  const theme = {
    ...DARK_THEME,
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
  };
  ```

  A CSS stack such as `"Menlo, monospace"` matches nothing in React Native.

- **Passing JSON text to `JsonTree`.** `value` is a parsed value. `JSON.parse` the body first.
- **No background.** No renderer draws `theme.background`. The container owns it.
- **Long lines run off screen.** `CodeHighlight` mounts no scroller. Wrap it in a `ScrollView` or a
  container with `overflow-x`.
- **Themes imported from the root.** They are a separate entry point,
  `@axonpack/react-pretty-print/themes`.
- **Importing it in plain Node.** The build is for bundlers (Metro, webpack, Vite and the like).

## Use it

| Component           | Required                                | Useful options                                                                                                |
| ------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `<JsonTree />`      | `primitives`, `value` (a parsed value)  | `rootLabel`, `theme`, `defaultExpanded` (root only, default `true`), `onCopy`, `onRequestMenu`, `matcher`     |
| `<XmlTree />`       | `primitives`, `source` (the XML string) | `theme`, `matcher`                                                                                            |
| `<CodeHighlight />` | `primitives`, `code`, `language`        | `theme`, `format` (re-indent minified code, default `true`), `maxHighlightLength` (default 50,000), `matcher` |

- **Copy.** Pass `onCopy` (`Clipboard.setStringAsync` from `expo-clipboard`, or
  `navigator.clipboard.writeText`). Without it no copy action is offered.
- **Context menu.** `onRequestMenu={(items, event) => ...}` fires on long-press (React Native) or
  right-click (web) with `MenuItem[]` (`{ label, onSelect, copyText? }`). You draw the popover and
  call `onSelect`.
- **Search.** `buildMatcher({ text: query, ...DEFAULT_SEARCH_MODES, matchCase: false })` gives a
  `matcher`. Branches with a match open and the rest collapse. A half-typed regex gives
  `{ pattern: null, invalid: true }`, which means no search, not no results.
- **Language from a response.** `detectLanguage(contentType, body)` reads the content type, then
  sniffs the body. `SUPPORTED_LANGUAGES` lists all 38.
- **Themes.** `DARK_THEME` (the default) and `LIGHT_THEME`, plus 128 named
  `<HUE>_<MODE>_<CHARACTER>_THEME`, such as `AZURE_DARK_VIVID_THEME`, all from
  `@axonpack/react-pretty-print/themes`. A theme is a plain object of colour tokens.
- **A broken XML document.** `XmlTree` renders a one-line reason and never throws.
- **Big code.** Above `maxHighlightLength` the code renders unstyled; tokenizing a megabyte of
  minified source can block the thread.
- **Your own rendering.** `tokenize(code, language)`, `formatCode`, `parseXml` and the tree helpers
  are exported too.

## Docs

- Installation: https://axonpack.dev/docs/react-pretty-print/installation
- Primitives: https://axonpack.dev/docs/react-pretty-print/primitives
- JsonTree: https://axonpack.dev/docs/react-pretty-print/json-tree
- CodeHighlight: https://axonpack.dev/docs/react-pretty-print/code-highlight
- Search: https://axonpack.dev/docs/react-pretty-print/search
- Themes: https://axonpack.dev/docs/react-pretty-print/themes
- Reference: https://axonpack.dev/docs/react-pretty-print/reference
