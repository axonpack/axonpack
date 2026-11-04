---
"@axonpack/expo-devtools": minor
---

- **`devtools context`**: a new topic that lists the names the Console tab's `>` prompt has, from `console.context` and each support, with their type, who exposed them and a short preview. It is off when `console.repl` is off. `devtools get context <name>` reads one, and takes a dot path such as `preview.status`
- **`devtools context call <name> [args] --yes`**: calls a function the app or a support exposed, with the object before the last dot as `this`, and prints what it returned. The args are one word of JSON: an array is the list of arguments, any other value is the one argument. A promise is waited for like a request, and every call shows in the CLI tab. Nothing else can be called, and no code is evaluated
