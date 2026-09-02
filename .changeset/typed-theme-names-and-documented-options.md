---
"@axonpack/expo-devtools": patch
---

- **`defaultTheme` only accepts a theme you have** — a built-in palette or one of your own from `themes`; anything else is a type error before the app runs
- **Every option explains itself in your editor** — hover any field of `createDevtoolsClient` for what it does and what it defaults to
- **The same for what the tools hand back** — crash records, request and console entries, storage adapters and performance samples all document their fields
- **Custom theme colours are named on hover**, so you can see what each one paints before you override it
