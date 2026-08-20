# Search & filter — implementation plan

> **Archived plan.** Written 2026-08-17 for the search and filter rework. Archived here on
> 2026-08-20: all seven asks shipped. Kept for the design record.

Planning doc for reworking the Network tab's filter panel and promoting its search box into a shared,
reusable input with match highlighting. Covers seven asks:

1. Clear + Invert buttons that act on the **whole** filter, not just the search text
2. `Search` as the placeholder instead of `Filter`
3. Status code as a filter option
4. Match case / Match whole word / Regex modes for search
5. The search box promoted to a common component
6. That same search available in the Payload, Response and Preview tabs
7. Themed background highlight on matched text, everywhere search exists

## Decisions taken

These were the calls where a different answer meant materially different work. Each was implemented
as recommended; the alternative is noted in case it should be revisited.

- [x] **What Invert inverts.** Recommended: it negates the _match_ predicate — search text, type,
      method, source and status — so "invert" means "everything that does not match what I asked
      for". The two noise switches (`Hide data URLs`, `Hide failed requests`) and the overview's time
      range stay absolute excludes and are **not** inverted; inverting a "hide" toggle would resurrect
      the exact noise you just hid. Alternative: invert literally everything.
- [x] **Status filter shape.** Recommended: chips for the classes actually present in the log —
      `2xx` `3xx` `4xx` `5xx`, plus `Failed` (network error, no code) and `Pending` (no code yet),
      derived the same way the Method and Source chip rows already derive their options. Exact codes
      (`404`) stay reachable by typing them in search, which already matches `statusCode`.
      Alternative: a free-text status field.
- [x] **Invalid regex behaviour.** Recommended: while the pattern is invalid (you are mid-typing
      `(foo`), the row's border turns `COLORS.error` and the search contributes **no** filtering, so
      the list doesn't blank out under you. Alternative: treat invalid as "matches nothing".
- [x] **Replacing `ReadOnlyTextInput` in the Response/Payload tabs.** Required for ask 7 — a RN
      `TextInput` cannot paint a background behind a _range_ of its value, so highlighting is
      impossible while those bodies render as a `TextInput`. They must become `<Text selectable>`.
      Text is still selectable and copyable, and the Copy button above it is unaffected; what changes
      is that the long-press selection UI becomes RN's Text selection rather than the input's.
      `ReadOnlyTextInput` stays in use in the Sandbox request panel and is not removed.
- [x] **One new palette token, `matchHighlight`,** added to `Palette` and to all seven built-in
      palettes (below). This widens a published type, so the release is a **minor** bump.

## Business flow

How this reads to someone using the panel.

- [x] Developer opens Network → Filter. The panel now opens with a header row: an `Invert` chip and a
      `Clear` button on the right, both acting on every filter below them
- [x] `Clear` is dimmed and inert when no filter is set; pressing it resets search text, search modes,
      type, method, source, status, both "hide" toggles, and any overview time range in one press
- [x] The search box reads `Search`, and carries three mode toggles on its right: `Aa` (match case),
      `ab` (match whole word), `.*` (regex)
- [x] A new `Status` chip row sits with Type / Method / Source
- [x] Matched text in the request list is highlighted with a themed background
- [x] Developer taps a request, opens Payload / Preview / Response. A search row sits under the tab
      bar, with the same three modes, and its matches are highlighted in the body
- [x] The Console tab's filter box gains the same three modes and the same highlighting, since it is
      now the same component
- [x] Switching theme repaints the highlight from the active palette, like everything else

## Reference behaviour

VS Code's find widget for the search modes (`Aa` / `ab` / `.*` glyphs, and the three are
independent); Chrome DevTools' Network filter bar for the invert/clear semantics.

- [x] Not mirrored — **next/previous match navigation and scroll-to-match**. That needs per-match
      layout measurement inside a scroll view to be useful, and is a feature of its own. Search
      highlights every match in place; it does not walk them
- [x] Not mirrored — **a match counter**. Planned, then dropped during implementation: the honest
      count differs per render mode (a JSON tree shows keys and values, not the raw body's braces and
      whitespace), so one number under the box would have been wrong for two of the three tabs. What
      the box does report is the oversize case — a body past the highlight cap says so outright
- [x] Not covered — highlighting inside the Preview tab's **WebView** (HTML/SVG bodies) and **image**
      previews. Those are opaque render surfaces; the search row is hidden when the preview resolves
      to one of them rather than showing a box that silently does nothing

## Architecture

### Matching core — `utils/text-search.util.ts` (new)

Core layer, no owning feature — Network, Console and the detail tabs all consume it, which is exactly
the `CONVENTIONS.md` core exception (same standing as `utils/layout-animation.util.ts`).

- [x] `type SearchModes = { matchCase: boolean; wholeWord: boolean; regex: boolean }`
- [x] `type SearchQuery = { text: string } & SearchModes`
- [x] `buildMatcher(query): Matcher | null` — compiles one `RegExp` (`g`, plus `i` unless
      `matchCase`), escaping the text when `regex` is off and wrapping in `\b…\b` when `wholeWord` is
      on. Returns `null` for empty text, and a `{ invalid: true }` marker for an uncompilable pattern
- [x] `testMatch(text, matcher): boolean` — the filter predicate. Resets `lastIndex` before each use;
      a shared `g` regex is stateful and this is the classic way to get every other row wrong
- [x] `findMatches(text, matcher): [start, end][]` — the highlight ranges. Guards against
      zero-length matches (`/x*/` would loop forever) and stops at a cap (see limits)
- [x] Unit tested in `utils/__tests__/text-search.util.test.ts`: escaping of regex metacharacters when
      `regex` is off, case sensitivity both ways, word boundaries against URL-ish text, invalid
      pattern handling, empty query, zero-length-match guard

Compiling once per query — not once per row — matters: the request list and the console list both run
this over every visible entry on every keystroke.

### Shared input — `components/ui/search-input.ui.tsx` (new)

- [x] Props: `value`, `onChangeText`, `modes`, `onModesChange`, `placeholder` (default `Search`),
      `invalid`, plus an optional `trailing` slot for a caller-supplied control
- [x] Owns the bordered-row markup and styles that `network-view` and `console-view` currently
      duplicate verbatim, exactly as `INPUT_STYLES.md` prescribes — leading `search` icon, bare
      `TextInput` (`padding: 0`), clear button at `TOUCH_TARGET.dense`, row at `TOUCH_TARGET.min`
- [x] The three mode toggles are glyph buttons (`Aa`, `ab`, `.*`) rather than icons — MaterialIcons
      has no match-case/whole-word/regex glyph, and VS Code's lettering is what people recognise.
      Each is a square `TOUCH_TARGET.dense` target with `HIT_SLOP.dense`, tinted `COLORS.accent` when
      on and `COLORS.textSecondary` when off
- [x] `invalid` swaps the row's `borderColor` to `COLORS.error`
- [x] Placement note: this is a `*.ui.tsx` atomic primitive, so per `CONVENTIONS.md` it belongs flat
      in `components/ui/`, **not** under `components/network/`. `INPUT_STYLES.md`'s "Where the styles
      live" section suggests `src/components/network/search-input.ui.tsx`, which predates the
      `components/ui/` standing exception — that line gets corrected as part of this work

### Highlight primitive — `components/ui/highlighted-text.ui.tsx` (new)

- [x] Renders `<Text selectable>` with the matched ranges wrapped in a nested `<Text>` carrying
      `backgroundColor: COLORS.matchHighlight`. Nested `Text` is the only way RN paints a background
      behind part of a string
- [x] Background only — no foreground override. The highlight is translucent so it composes over
      syntax-coloured JSON and code tokens without flattening them to one colour
- [x] Falls through to a plain `<Text>` when there is no matcher, so the non-searching path costs
      nothing
- [x] Accepts `numberOfLines` and a style, so `TextArgCell`'s clamped console rows keep working

### Palette — `constants/theme.const.ts`

One new token, `matchHighlight`, on `Palette` and all seven built-ins. Translucent (8-digit hex,
which RN supports) so one value works over both the row background and coloured text, and each is
drawn from that theme's own published yellow, matching how every other token here was mapped:

| Palette         | `matchHighlight` | Source colour        |
| --------------- | ---------------- | -------------------- |
| light           | `#f9ab0059`      | its own `warning`    |
| dark            | `#fdd66340`      | its own `warning`    |
| dracula         | `#f1fa8c40`      | Dracula yellow       |
| nord            | `#ebcb8b40`      | Nord `aurora` yellow |
| monokai         | `#e6db7440`      | Monokai yellow       |
| one-dark        | `#e5c07b40`      | One Dark yellow      |
| solarized-light | `#b5890040`      | Solarized yellow     |

Custom themes patch a base via `{ base, colors }`, so they inherit it and no consumer is forced to
supply it.

### Network filter state — `network-view.component.tsx`

Eight separate `useState` calls become one object plus a reset, which is what makes "clear
everything" a single line instead of eight setter calls that will drift apart:

- [x] `DEFAULT_NETWORK_FILTERS` and the `NetworkFilters` type live beside the predicate in
      `utils/network/filter-entries.util.ts`
- [x] `const [filters, setFilters] = useState(DEFAULT_NETWORK_FILTERS)`, with a `patch` helper
- [x] `clearFilters()` resets the object **and** `activeTimeRange` — the overview's brushed range is a
      filter even though it is set from a different surface
- [x] `hasActiveFilters` drives the `Clear` button's dimmed state
- [x] `invert` moves into the object and is applied around the whole match predicate

### Predicate — `utils/network/filter-entries.util.ts`

- [x] `matchesQuery(entry, matcher)` takes a compiled matcher rather than a lowercased string
- [x] `matchesFilters(entry, filters, matcher)` folds type/method/source/status/search into one
      predicate, with `invert` negating the result and the hide-toggles applied outside it
- [x] `statusClass(entry)` → `'2xx' | '3xx' | '4xx' | '5xx' | 'failed' | 'pending'`, used both to
      derive the available chips and to test the active one
- [x] Existing test file `utils/network/__tests__/` gains coverage for status classification and
      invert semantics

### Highlighting the request list — `log-row.component.tsx`

- [x] The URL (and the `bigRows` display name) render through `HighlightedText`
- [x] `LogRow` is `memo`'d with an explicit comparator — it gains a `matcher` prop, so the comparator
      must compare it too, and `NetworkView` must build the matcher inside a `useMemo`. Without both,
      every row re-renders on every unrelated state change

### Detail panel search — `components/network/detail-panel/index.tsx`

- [x] One search row lives in the panel, under the tab bar, shared by the three body tabs — not three
      separate boxes. Query and modes are panel state, so switching Payload → Response keeps them
- [x] Rendered only for `payload` / `preview` / `response`. `headers` and `timing` are out of scope
      for this pass (both are worth searching later; neither was asked for)
- [x] The matcher is passed down to the three tabs

Each tab then needs a different path to the same highlight, because each renders its body
differently:

- [x] **Response tab** — `ReadOnlyTextInput` → `HighlightedText`
- [x] **Payload tab** — source mode `ReadOnlyTextInput` → `HighlightedText`; parsed mode is a
      `JsonTree`
- [x] **Preview tab** — resolves to `JsonTree`, `CodeHighlight`, a `WebView`, or an `Image`. The first
      two highlight; the last two cannot, and the search row hides for them
- [x] **`JsonTree` / `JsonNode`** — the matcher is prop-drilled through `JsonTree` → `JsonNode` →
      `JsonChildren` (`JsonNode` already carries six props; a seventh is in keeping, and this avoids
      inventing a context layer the conventions don't have). Keys and scalar values highlight
- [x] **`CodeHighlight`** — matches are computed once on the formatted string, then intersected with
      the token ranges while walking them with a running offset, so a match spanning two tokens still
      paints across both. A `splitTokenByMatches` helper in `utils/network/code-highlight.util.ts`,
      unit tested there

### Console — `console-view.component.tsx`, `text-arg-cell.component.tsx`

- [x] Its hand-rolled search row is replaced by the shared `SearchInput`, so it inherits the three
      modes and the `Search` placeholder for free
- [x] `TextArgCell` renders through `HighlightedText` (it is already a plain `Text`, including the
      clamped/expandable branch)
- [x] `ConsoleRow`'s `memo` comparator gains the matcher, same reasoning as `LogRow`
- [x] Console does **not** get Invert / Clear-all in this pass — it has three filters and no invert
      concept today. Easy to add later; say the word if you want it now

### Known limits

- [x] `wholeWord` uses JS `\b`, which is word-character based — searching `api` whole-word does match
      inside `/api/v2` because `/` is not a word character. That is the standard editor behaviour,
      not a bug, but it surprises people on URLs
- [x] Bodies are logged untruncated by design, so highlighting is capped: no highlight pass above
      `MAX_HIGHLIGHT_LENGTH` (the cap `CodeHighlight` already applies to syntax highlighting), and a
      match-count ceiling per body so a one-character query on a megabyte of JSON can't build tens of
      thousands of nested `Text` nodes. Above either cap the text renders plain and the row says so
- [x] No match navigation, so a match far down a long body still has to be scrolled to by hand
- [x] Filter state remains in memory for the session — there is no storage dependency in this package

## Implementation plan

### Phase 1 — Foundation

- [x] `utils/text-search.util.ts` + tests
- [x] `matchHighlight` token across `Palette` and the seven built-in palettes
- [x] `components/ui/highlighted-text.ui.tsx`
- [x] `components/ui/search-input.ui.tsx`
- [x] Correct `INPUT_STYLES.md`'s "Where the styles live" section to point at `components/ui/`

### Phase 2 — Network filter panel

- [x] Filter state consolidated into one object in `filter-entries.util.ts`
- [x] Header row: `Invert` chip + `Clear` button, acting on everything
- [x] Swap in `SearchInput` (placeholder `Search`, three modes, invalid-regex border)
- [x] `Status` chip row + `statusClass` + predicate rework + tests

### Phase 3 — Highlight the request list

- [x] Memoized matcher in `NetworkView`, threaded to `LogRow`
- [x] `LogRow` URL/name through `HighlightedText`, comparator updated

### Phase 4 — Detail panel tabs

- [x] Shared search row in `detail-panel/index.tsx`, scoped to the three body tabs
- [x] Response + Payload source bodies → `HighlightedText`
- [x] `JsonTree` matcher drilling
- [x] `CodeHighlight` token/match intersection + tests
- [x] Preview: hide the row for WebView and image bodies

### Phase 5 — Console parity

- [x] `ConsoleView` adopts `SearchInput`
- [x] `TextArgCell` highlights; `ConsoleRow` comparator updated

### Phase 6 — Wrap up

- [x] `bun run lint`, `check-types`, `test` green
- [x] `README.md` / `REFERENCE.md` — document the search modes and the `matchHighlight` theme token
- [x] Changeset: **minor** for `@axonpack/expo-devtools` (new filter/search capability, new public
      palette token)
