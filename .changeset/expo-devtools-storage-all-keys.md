---
"@axonpack/expo-devtools": minor
---

- **Every storage key is listed, and a value is read only when you look at it**: opening a store lists all of its keys and reads none of their values. A value is read once its row is on screen, when you open the key, or when you export. A fast scroll reads nothing it passes. Until then the row shows a placeholder for type and size.
- **Search on key names covers every key.** Value search, the type filter, size and type sorting and the totals cover the values read so far, and the summary says how many that is. Size and type sorts put unread rows last.
- **Live MMKV changes follow the same rule**: a changed key is read again only if its value was already read or its row is on screen, and a new key joins the list unread.
- **The React Native DevTools tab draws 50 rows at a time**, with a button for more, and reads the values of the rows it draws. With values still unread, the first click on Export reads them and the second downloads the file.
- **Keys sort without regard to case**, with `A` before `a` when two keys differ only in case. The sort no longer goes through `localeCompare`, which held the JS thread for most of a second on a 10,000-key store on Android.
- **`storage.maxKeys` is deprecated and ignored**, since nothing is capped any more. **`StorageAdapterState.truncated` is gone**, and keys not read yet have the new `'unread'` kind.
- **No more debug logging**: opening a request in the Network tab no longer prints `DetailPanel` to the app's console on every render.
