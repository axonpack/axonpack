---
"@axonpack/preview": patch
---

- **The first switch to a preview no longer marks it broken on iOS**: in a debug build with expo-dev-client, the first switch after the app started on the default bundle restarted the app twice, so the preview was marked broken ("stopped before it finished starting") and Metro loaded again. Later switches worked. The switch now counts as the start, so the app restarts once. Needs a native rebuild
- **No "Could not read the preview state" warning when nothing is chosen**: iOS logged it whenever nothing was chosen, such as at a launch after Back to default or after a preview was marked broken. It now logs only when `state.json` can't be read as JSON. Needs a native rebuild
