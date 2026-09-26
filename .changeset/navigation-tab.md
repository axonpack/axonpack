---
"@axonpack/expo-devtools": minor
---

- **Navigation tab**: every screen the app moved through, with when, from where, the params and how long it stayed on top
- **Works with Expo Router and React Navigation**: Expo Router is found on its own, and so is a React Navigation container the provider sits inside
- **`useDevtoolsNavigation(ref, name)`**: hands over a container mounted inside the provider, under a name
- **Navigator tree**: every container drawn as one track, with a flow's own container under the screen that holds it
- **Back from the panel**: a Back button on the screen you are on
- **Open a screen**: pick a container, type a route with params from suggestions, or open a deep link
- **Where a move came from**: the line in your code that dispatched it, with the source around it
- **Search, pause and clear the history**, and filter it by container
- **Copy the history as Markdown, or export it as JSON**
- **`navigation.redact(move)`**: strip tokens from params before a move is stored, or return `null` to drop it
- **Route on crash reports**: every report carries the screen it happened on, and screen changes join the breadcrumbs
