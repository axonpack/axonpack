# JSON

A value as a tree you can open, close and copy out of.

- [x] Objects and arrays expand and collapse a level at a time
- [x] A closed container previews its contents rather than showing an empty brace
- [x] An empty object or array has no toggle, because opening it would show nothing
- [x] A large array is bucketed into ranges instead of listing thousands of rows
- [x] A whole subtree can be expanded or collapsed in one action
- [x] Any node's value can be copied as formatted JSON
- [x] Object keys are shown in sorted order
- [x] The root can start open or closed
- [x] A search opens only the branches holding a match and paints the matched runs
- [ ] A flat, non-interactive dump as an alternative to the tree

## What the design turns on

**Paths are the identity.** Every node has a string path, and the expansion state is a set of those
paths rather than a flag on a node. That is what makes expanding a subtree a set union and
collapsing one a prefix filter, and it means the state survives the value being re-parsed on every
render upstream — which is what a caller feeding a live response body will do.

**A preview shows content, not shape.** A closed node reads as its first few entries, capped by both
entry count and length. A bare brace tells a reader nothing about whether the branch is worth
opening, and this is a tool for deciding exactly that. Browsers keep that preview visible on an open
row too, so this does the same.

**Chunking is not a nicety.** A response with ten thousand elements would otherwise render ten
thousand rows to reach one of them. Ranges are addressed in the path syntax, so a bucketed array is
never addressed by flat index — the two ways of reaching an element must not both exist or expansion
state would fork.

**Only literals are typed.** Numbers and booleans share a colour deliberately: both are literals,
and painting `2` and `true` differently is noise rather than information. Keys are guaranteed a
different colour from strings, or a tree is unreadable at a glance.

## Won't do

- **Editing a value.** This renders what it is handed. A tree that writes back needs to know what it
  is writing to, which is a different tool.
- **Virtualising the row list.** Bucketing already bounds how many rows exist at once, and a
  windowing list would need a scroller — which belongs to the caller.
