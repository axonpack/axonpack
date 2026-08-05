# Input styles

Canonical text-input styling for `@axonpack/expo-devtools`, based on the network filter search box
(`packages/@axonpack/expo-devtools/src/components/network/network-view.component.tsx`). Use this as the
reference when adding another text input anywhere in the devtools UI, so inputs stay visually
consistent with the rest of the browser-devtools-style network view.

## Structure

An input is a bordered row (`searchRow`) containing a leading icon, a borderless `TextInput`
(`searchInput`) that fills the remaining space, and optional trailing controls (a clear button,
an action chip):

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
    <TouchableOpacity onPress={() => onChangeText("")} hitSlop={8}>
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
    paddingVertical: 6,
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
});
```

- Border/radius/spacing live on the wrapping row, not the `TextInput` itself — the `TextInput`
  stays visually bare (`padding: 0`, no border) so the row is the only visible chrome.
- Colors always come from `COLORS` (`src/constants/colors.const.ts`) — never hardcode hex values
  in an input's styles.
- `placeholderTextColor` is always `COLORS.textSecondary`, matching how secondary text is styled
  everywhere else in the network view.

## Where the styles live

Per this repo's file-naming convention (see the root `CLAUDE.md`):

- **Single-use** — if the input only appears in one view (the current state), its styles stay
  inline in that file's own `StyleSheet.create`, same as `searchInput`/`searchRow` in
  `network-view.component.tsx` today. Don't create a separate styles file for a single consumer.
- **Reusable** — if an input is needed in more than one place, promote it to its own component
  file (e.g. `src/components/network/search-input.ui.tsx`), sibling to `chip.ui.tsx` /
  `icon-button.ui.tsx` / `setting-row.ui.tsx`, with the styles above co-located inside that same
  file.
