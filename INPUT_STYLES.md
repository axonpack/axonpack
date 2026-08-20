# Input styles

Canonical text-input styling for `@axonpack/expo-devtools`, implemented by the shared search box
(`packages/@axonpack/expo-devtools/src/core/components/ui/search-input.ui.tsx`). Use this as the
reference when adding another text input anywhere in the devtools UI, so inputs stay visually
consistent with the rest of the browser-devtools-style network view.

## Structure

An input is a bordered row (`searchRow`) containing a leading icon, a borderless `TextInput`
(`searchInput`) that fills the remaining space, and optional trailing controls (a clear button,
mode toggles, an action chip):

```tsx
<View style={styles.searchRow}>
  <MaterialIcons name="search" size={16} color={COLORS.textSecondary} />
  <TextInput
    style={styles.searchInput}
    value={value}
    onChangeText={onChangeText}
    placeholder="Filter"
    placeholderTextColor={COLORS.textSecondary}
    autoCapitalize="none"
    autoCorrect={false}
  />
  {value.length > 0 && (
    <TouchableOpacity
      onPress={() => onChangeText("")}
      hitSlop={HIT_SLOP.dense}
      style={styles.searchClear}
    >
      <MaterialIcons name="close" size={16} color={COLORS.textSecondary} />
    </TouchableOpacity>
  )}
</View>
```

## Styles

```ts
const styles = StyleSheet.create({
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    // Height, not padding: the row *is* the tap target that focuses the field, so it takes the
    // platform floor from `core/constants/metrics.const.ts` rather than a padding that happened to look right.
    minHeight: TOUCH_TARGET.min,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    padding: 0, // RN adds default vertical padding to TextInput; zero it so it aligns with the row
  },
  // A trailing control is square and centred rather than glyph-sized, so it doesn't stretch the field.
  // `TOUCH_TARGET.dense` plus the slop above, not the 44 floor — the row's own height carries that.
  searchClear: {
    width: TOUCH_TARGET.dense,
    height: TOUCH_TARGET.dense,
    alignItems: "center",
    justifyContent: "center",
  },
});
```

- **Docked bars are the one exception.** An input pinned to an edge of its panel — currently just
  the Console tab's `>` prompt (`src/features/console/components/console-prompt.component.tsx`) — drops the
  border, radius and outer margins and takes a single hairline separator on the edge it docks
  against, spanning the full width. A rounded box floating against a panel edge reads as misaligned
  chrome. Everything else below still applies: `padding: 0` on the `TextInput`, colors from
  `COLORS`, `placeholderTextColor` of `COLORS.textSecondary`.
- Border/radius/spacing live on the wrapping row, not the `TextInput` itself — the `TextInput`
  stays visually bare (`padding: 0`, no border) so the row is the only visible chrome.
- Colors always come from `COLORS` (`src/core/constants/theme.const.ts`) — never hardcode hex values
  in an input's styles.
- Sizes that decide whether something can be _hit_ come from `TOUCH_TARGET` / `HIT_SLOP`
  (`src/core/constants/metrics.const.ts`) — never a literal. The panel's scale was tuned on a simulator,
  where a dp reads much larger than on a phone, and every control drifted under the platform floor
  once. `hitSlop` is a top-up, never the whole target: on Android a child's slop is clipped by its
  parent's bounds, so a bordered row still needs real height of its own.
- `placeholderTextColor` is always `COLORS.textSecondary`, matching how secondary text is styled
  everywhere else in the network view.

## Where the styles live

Per this repo's file-naming convention (see the root `CLAUDE.md`):

- **Single-use** — if the input only appears in one view, its styles stay inline in that file's own
  `StyleSheet.create`. Don't create a separate styles file for a single consumer.
- **Reusable** — if an input is needed in more than one place, promote it to its own `*.ui.tsx`
  file, with the styles above co-located inside it. Per `CONVENTIONS.md`, an atomic primitive lives
  flat in `src/core/components/ui/` — **not** under a feature subfolder — sibling to `chip.ui.tsx` /
  `icon-button.ui.tsx` / `setting-row.ui.tsx`. The search box described above has already made that
  move: it is `src/core/components/ui/search-input.ui.tsx`, shared by the Network filter panel, the
  Console filter panel and the request detail panel.
