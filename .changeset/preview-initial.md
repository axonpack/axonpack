---
"@axonpack/preview": minor
---

- **New package**: publish a JS bundle per branch or pull request, and switch to it in the installed app with no native rebuild
- **Preview list**: `PreviewProvider` and a ready-made list to download, switch, update and delete previews. `usePreview` and `useRunning` let you build your own screen
- **Crash fallback**: if a preview crashes before it starts, the next launch goes back to the built-in bundle
- **Only previews that fit**: matched by app version or native fingerprint with the config plugin's `compatibility` option. Downloads for another build show under Incompatible, with Delete all
- **`preview` CLI**: `publish`, `unpublish` and `prune` work with any S3-compatible bucket, public or private with a read-only key. `--environment` builds with an EAS environment's variables
- **Local Metro servers**: `preview start` runs Metro on a free port, and debug builds can switch between local servers from the list
- **expo-updates**: works alongside it
