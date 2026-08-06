---
"@axonpack/expo-devtools": minor
---

## ✨ Features

- **Console** — a new tab in the devtools panel showing everything your app logs, without a desktop debugger attached.
- Warnings and errors are coloured and counted, so problems stand out while you scroll.
- Objects and arrays can be opened up and explored, instead of appearing as `[object Object]`.
- Errors show their full stack when you tap them.
- The same message logged over and over collapses into one line with a count, so a chatty screen doesn't bury everything else.
- **Run an expression** — type JavaScript at the prompt and see the result straight away, with name suggestions as you type.
- Tap a command you ran earlier to load it back into the prompt and send it again.
- Anything logged inside an in-app browser page is captured too, labelled so you can tell it apart from your app's own output.
- Filter by level or by where a message came from, or search the text of every message.
- The list follows new output as it arrives, and holds still when you scroll back to read something, with a button to jump to the newest again.
- Copy any line with one tap.
- Nothing is captured until you turn devtools on, the same as the network inspector, and the expression prompt stays out of production builds unless you ask for it.
