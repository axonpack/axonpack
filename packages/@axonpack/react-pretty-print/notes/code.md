# Code

Syntax highlighting, with no highlighting engine underneath it.

- [x] Thirty-eight languages, from the C family through the shell family to the line-oriented formats
- [x] The language can be worked out from a content type, falling back to reading the body
- [x] Minified source is re-indented before it is shown, and that can be turned off
- [x] Text is never dropped: whatever comes in is what renders
- [x] A body past a size cap renders unhighlighted rather than blocking, and the cap can be raised or removed
- [x] The token stream is available on its own, for a caller that wants to render it itself
- [ ] A line-number gutter
- [x] A search match is painted even where it spans a token boundary

## What the design turns on

**Families, not language files.** Fifteen of the supported languages differ only in their keyword
vocabulary — same comment markers, same string delimiters, same operators. So a family takes a word
list and returns a rule table, and the vocabularies live apart from the rules as data. Adding a
language is a word list and one line; that ratio is the reason the count can be what it is without a
dependency.

**Rules are ordered, and order is the algorithm.** The first rule that matches wins, so a keyword
list has to be longest-first where one word prefixes another, and a block comment has to be tried
before a line comment. When nothing matches, one character is consumed and consecutive such
characters coalesce — otherwise an unrecognised body becomes one node per character.

**Detection reads the body, not just the label.** Plenty of servers label everything plain text or a
generic binary type, so a content type that says nothing falls through to sniffing. That ordering
has teeth: a section header and an array open with the same character, so a configuration file has
to show a key assignment as well before it wins over JSON.

**Re-indenting is not pretty-printing.** It breaks lines on braces and statement terminators and
spaces separators, and it does nothing else — it will not insert a space after a keyword, and it
will not invent a terminator the source omitted. It runs only where structure is punctuation:
anything whose indentation carries meaning is excluded, and that exclusion is asserted rather than
assumed.

**Why not an existing engine.** Adopting a general highlighter would bring several hundred languages
and, with them, a theme format shaped for CSS that has to be translated into React Native styles at
runtime — unit conversion, property renaming, and a list of properties to drop. That translation
layer is where the cost and the edge cases live, and it is the reason the themes here are a
token-role map instead. Four languages covered the original need; the families made thirty-eight
cheap enough that the trade never came back.

**The tokenizer is the escape hatch.** Because it is exported, a caller who wants its own rendering
takes the tokens and skips the component — which is what other highlighters need a renderer prop
for.

## Won't do

- **Hundreds of languages.** Only reachable by depending on a highlighting engine; see above.
- **Semantic highlighting.** Distinguishing a type from a variable of the same shape needs a parser
  with scope, not a lexer.
- **Weight and style per token.** Some light themes distinguish keywords by weight rather than hue,
  and those read flat here. The token contract carries colours only, and adding a weight would mean
  every palette answering for it.
