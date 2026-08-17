---
"@axonpack/expo-devtools": minor
---

- Search the Payload, Preview and Response tabs of a request, with every match highlighted in place — in the JSON tree, in syntax-coloured code, and in the raw body
- Searching a JSON tree opens the branches holding a match and collapses the rest, so a hit is never buried in a closed node
- Match case, whole word and regex switches on every search box, in the Network filter, the Console filter and the request detail panel
- Highlighted matches in the request list and in console output
- Filter requests by status — 2xx / 3xx / 4xx / 5xx / Failed / Pending, offering only the ones actually captured
- Invert now flips the whole Network filter rather than only the search text, and a new Clear resets every filter at once
- New `matchHighlight` palette token, set on all seven built-in themes, for the search highlight background
- Fixed the Preview tab rendering unsyntax-highlighted bodies in near-black, unreadable on every dark theme
