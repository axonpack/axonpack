# Modal

The update prompt, how it looks, and how to replace it.

- [x] A ready-made prompt with an icon, both versions, release notes and three actions
- [x] The release notes sit in a row that opens and closes, and starts closed
- [x] A mandatory update shows only the Update action, in a warning colour
- [x] Light and dark mode, following the device or pinned to one
- [x] Every colour, the corner radius, the width and the fonts can be set
- [x] Every label can be changed, for tone or for translation
- [x] The round icon can be replaced with any element
- [x] A spinner shows while the store opens
- [x] Your own component can draw the prompt, and still gets the checking, skipping and refreshing
- [x] Checks when it appears and again each time the app returns to the foreground
- [x] A hook gives the same state to a screen of your own
- [ ] A banner style, for an update that should not cover the screen

## What the design turns on

**The modal is a plain function of its props.** The prompt owns the check and the open or closed
state, and hands everything the screen needs to the component, so a custom component and the
default one receive the same thing.

**Native components are read lazily.** The package imports no React Native module at load, so the
logic stays testable and a bundle without the optional pieces still builds.

**The back button follows the rule.** It closes a soft prompt and does nothing on a mandatory one,
because anything else would trap people or let them past a forced update.
