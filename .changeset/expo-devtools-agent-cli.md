---
"@axonpack/expo-devtools": minor
---

- **Read the devtools from a terminal**: you or an AI agent can run `npx @axonpack/expo-devtools`, with any package manager, to list the running apps and read every tab: requests, console, performance, storage, query, navigation, Redux and crashes
- **Find the rows you need**: search, filter by any field, pick a time window, sort, count and group with the same flags on every tab, and open one row whole
- **Poll for what's new**: each list ends with a cursor that gets only the rows after it
- **Your redaction holds**: every redaction setting applies, and auth headers and cookies are always hidden
- **Older React Native**: below 0.86 it asks through the open React Native DevTools window, so that window stays open
- **AI Usage tab**: every query an agent made and the reply it got, in the app and in React Native DevTools. `aiUsage.disabledByDefault` opens it paused
