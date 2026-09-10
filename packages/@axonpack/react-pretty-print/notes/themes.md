# Themes

A palette is a flat set of colour roles, and there are a hundred and thirty of them.

- [x] One neutral dark and one neutral light palette, which every renderer defaults to
- [x] A hundred and twenty-eight more, across sixteen hues, light and dark, in four characters
- [x] Every palette states the surface it was designed against
- [x] Any palette can be edited, or a new one written by hand, without touching anything else
- [x] The palettes are a separate entry point, so a project that only wants a renderer pays nothing
- [ ] A high-contrast pair tuned for accessibility requirements specifically

## What the design turns on

**A token-role map, never a stylesheet.** Each renderer turns roles into its own styles, so there is
nothing to translate between platforms. Shipping CSS themes and converting them at runtime is the
tax the whole approach avoids.

**Contrast is solved for, not eyeballed.** This is the reason a set this large is safe: every
colour clears a contrast ratio against its own palette's background, and that is asserted for all
hundred and thirty rather than trusted. Two consequences worth knowing. Keys are guaranteed a
different colour from strings, because a tree whose keys and values match is unreadable no matter
how well-chosen the colours are. And the muted tone that punctuation, the expand arrow and the empty
value share is pulled from the palette's own text toward its own background — far enough to stay
recessive, but stopped before it drops below the floor, which a fixed blend does not do on the
lower-contrast characters.

**Hue is asserted separately from contrast.** Contrast is hue-blind: rotating every colour a third
of the way around the wheel leaves every ratio intact while making every palette named for one hue
render as another. So a palette named for a hue is checked to actually be that hue.

**The two neutrals are not part of the scheme**, and that is why they exist. Every constructed
palette is tinted toward its base hue, so neither a plain grey nor a plain white is reachable
through the recipe — and a payload viewer wants the option of a surface that casts nothing over its
content. They come first, and they are what the renderers default to.

**The background is stated but never painted.** No renderer draws it: the caller owns its container.
It is in the contract anyway, because a dark palette on a light page is unreadable and the caller
needs to know which one it was handed.

**The file is source, not output.** The construction rules are written in its header rather than in
a script, so a hand-written addition matches the rest. What keeps the set honest is the tests, not
the way the file was first produced.

## The one token a caller has to set

Every palette ships a monospace family name that is right on the web and on Android and silently
proportional on iOS, where the family has a different name. The package cannot choose per platform:
it imports no platform, which is the property everything else here depends on. So the token exists,
the default suits the platform that cannot override it, and a React Native caller sets it once. The
native example does, and says why.

This is the shape of every such decision here — where a value can only be right per platform, it
becomes something the caller supplies rather than something the package guesses.

## Won't do

- **Read a theme from a CSS stylesheet.** That is the translation layer this design exists to avoid.
- **Persist the reader's choice.** Storage is a dependency, and which palette to use is the caller's
  state anyway.
