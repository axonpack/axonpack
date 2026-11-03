---
"@axonpack/preview": minor
---

- **`PreviewList` without a FlatList**: `virtualized={false}` draws every row in a plain ScrollView, for a place a FlatList can't run, such as a React Native DevTools tab. There is no pull to refresh then
- **Add a host types in a DevTools tab too**: the field no longer throws there when typed into
- **Set up through `@axonpack/expo-devtools`**: pass this package's config as `preview` in the devtools config and the devtools mount the provider and add a Preview tab
