# List

The ready-made list QA uses in the app, and the hook that says what runs.

- [x] A header card for what runs now: its name, its address, what kind it is, and whether it is the default
- [x] The rest of the facts for a bug report behind Show details: branch, id, environment, app version and build, commit, platform and build key
- [x] One action back to the default, from a preview or a picked server: the default Metro in a debug build, the built-in bundle in a release build
- [x] Errors in plain words in a snackbar, with Retry and Dismiss, and the fix for the Android emulator
- [x] Each published preview with its state, environment, changelog, who published it and when, its size and one main action
- [x] Rows of chips that scroll sideways instead of wrapping
- [x] Says previews aren't set up, with no error, when the app has no bucket URL
- [x] Light and dark, a theme written by hand, or the palette the app gives expo-devtools
- [x] Every piece of text can be changed
- [x] Styled and extended like any list: its style, its padding, and the app's own header and footer
- [x] A hook that returns what the header card shows, for a banner or badge of the app's own

The whole list is one FlatList with a header, so it can sit in a screen, a tab or a modal without a
scroll view around it. The rows are built by a pure function, which is what the tests cover.

The hook is the one source of truth for what runs. The header card and the example's banner both
read it, so they can't disagree. What runs is read from what native says it loaded, not from what
was chosen, so a preview that could not start shows the default bundle running.

The expo-devtools palette is typed by its shape only, so this package does not depend on
expo-devtools. Only light and dark are built in.

Every label from 0.1.0 is still accepted. The ones no longer shown are marked deprecated, and
`backToBase` and `status` still show when an app sets them and not their new names.
