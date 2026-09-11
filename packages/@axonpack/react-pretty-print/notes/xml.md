# XML

A document as a tree, parsed without a platform parser.

- [x] Elements expand and collapse; text and character data are leaves
- [x] Attributes are shown inline on the element they belong to
- [x] Character-data blocks are marked as such, and their contents left exactly as written
- [x] The five named entities and numeric ones are decoded
- [x] Indentation between elements is dropped, but mixed content keeps its fragments
- [x] A document that will not parse explains why instead of failing
- [x] A new document re-parses rather than showing the previous one
- [x] A search opens only the elements holding a match and paints the matched runs

## What the design turns on

**React Native has no `DOMParser` and no DOM**, so the browser approach — hand a parsed document to a
renderer — is unavailable. This is the smallest parser that answers what a reader asks of a
document: what are the elements, what are their attributes, what text is inside them.

**It is not a validator.** A document is read to be understood, not certified. Anything malformed
returns a reason for the caller to show its raw text against, rather than throwing — a reader who
opened a payload to find out what is wrong with it is not helped by an exception. The prologue,
comments and doctype are dropped rather than represented: they are rarely what someone opened the
document to read, and the caller still has the raw text.

**Character data is the one place markup is deliberately not markup**, so it is kept apart from text
and never decoded. Collapsing the two would silently rewrite the thing a reader is inspecting.

**Attributes wrap rather than overflow.** Each is its own inline node, so a long tag has to be able
to break across lines; the separation between them comes from a gap rather than a literal space,
because a space at the edge of a flex item is trimmed on the web and kept on React Native.

## Won't do

- **Namespace resolution.** Prefixes are shown as written. Resolving them needs a document-wide pass
  and answers a question about correctness, which is a validator's job.
- **DTD or entity declarations.** An internal subset is skipped. Honouring custom entities means
  implementing a subset of a DTD parser to render a payload.
