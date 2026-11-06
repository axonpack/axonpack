---
"@axonpack/preview": patch
---

- **The first switch to a preview no longer marks it broken on iOS**: in a debug build with expo-dev-client, the first switch after the app started on the default bundle restarted the app twice, so the preview was marked broken ("stopped before it finished starting") and Metro loaded again. Later switches worked. The switch now counts as the start, so the app restarts once. Needs a native rebuild
