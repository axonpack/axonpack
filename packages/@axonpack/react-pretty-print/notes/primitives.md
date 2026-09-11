# Primitives

The boundary that lets one implementation serve React and React Native.

- [x] Every renderer takes the container, text and pressable components from the caller
- [x] React Native's own components work unchanged — nothing to write
- [x] A DOM set ships with the package, so a web project needs nothing but React
- [x] Text stays selectable, so a reader can copy out of a tree or a code block
- [x] A long press or right click reports which actions apply to the node it happened on
- [x] Copying is offered only when the caller says how to copy

## Why the caller supplies the components

There are three ways to serve both platforms and this is the third. Writing the tree twice doubles
every future change. Building against React Native and telling web consumers to alias
`react-native-web` works, but it makes a web project install a compatibility layer and configure its
bundler to print some JSON — the opposite of working out of the box. Passing the components in costs
one prop and leaves both platforms first-class.

The contract is deliberately narrow: a container, text, and something pressable. Nothing else is
needed, and every addition is a thing a caller has to supply.

**The types are loose on purpose.** React Native's style type and the DOM's are not assignable to
each other in either direction, so a single concrete style type would reject one platform outright.
The same reasoning decides the press event: it is passed through untouched, as an opaque value the
package never reads. Anything narrower fails contravariance and forces every React Native consumer
to write a wrapper — which would throw away the property that makes this worth doing, that the
platform's own components drop straight in.

Only two things are platform-shaped enough to need an adapter, and only on the web, because the DOM
has no press events: mapping a click and a context menu onto them. That adapter ships.

## What stays with the caller, and why

**The context menu popover.** Which actions apply to a node, and what each one does to the
expansion state, is the part worth sharing, so that is what the package computes and hands back. The
popover itself cannot be shared: a floating menu has to escape its scroll container, which needs a
modal on React Native and a portal or fixed positioning on the web. React Native has no portal and
the DOM has no modal, so there is no common subset to write against. Both example apps carry a
reference implementation, one of each.

**The clipboard.** React Native's is a separate install; the web's is on `navigator`. The package
takes a function and offers the copy actions only if it gets one.

**Scrolling.** A long code line has to scroll horizontally and a large tree vertically. Only the
caller can mount a scroller, and only the caller knows whether the tree is already inside one.

## Won't do

- **Detect the platform and branch internally.** Reading `Platform.OS` would mean importing
  `react-native`, which is the dependency the whole design exists to avoid.
- **Ship the popover behind a platform check.** Same reason, plus it would have to guess where the
  caller wants it anchored.
