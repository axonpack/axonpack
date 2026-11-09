---
"@axonpack/preview": patch
---

- **The first switch to a preview no longer marks it broken on iOS**: in a debug build with expo-dev-client, the first switch after the app started on the default bundle restarted the app twice, so the preview was marked broken ("stopped before it finished starting") and Metro loaded again. Later switches worked. The switch now counts as the start, so the app restarts once. Needs a native rebuild
- **A broken preview offers its update**: once a newer revision is published, a preview marked broken shows Update available where it kept saying Broken, and downloading it again, after an update or a delete, takes the mark off. The mark clears on download only after a native rebuild
- **No "Could not read the preview state" warning when nothing is chosen**: iOS logged it whenever nothing was chosen, such as at a launch after Back to default or after a preview was marked broken. It now logs only when `state.json` can't be read as JSON. Needs a native rebuild
- **A picked dev preview server loads under expo-dev-client on iOS**: in a debug build with expo-dev-client, tapping a server in the dev servers list restarted the app on the dev launcher's server instead. The switch now hands React the picked server. Needs Expo SDK 58, or 57.0.23 or later, and a native rebuild
