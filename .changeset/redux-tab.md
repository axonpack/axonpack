---
"@axonpack/expo-devtools": minor
---

- **Redux tab**: every action your store reduced, with its time and payload. Tap one to see the state after it and what it changed. Add `devtoolsReduxEnhancer()` to your store; it works with Redux Toolkit and plain `createStore`, and the package still does not depend on redux
- **Dispatch from the panel**: type an action as JSON and send it to your store, or send a recorded one again
- **`redux.allow` and `redux.deny`**: which action types are kept, by exact name or pattern. A noisy type can also be dropped from the panel while the app runs. `redux.disabledByDefault` opens the tab paused
