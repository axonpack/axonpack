---
"@axonpack/preview": patch
---

- **`--environment` leaves nothing in `.eas/.env/`**: `eas env:pull` writes file-type variables into the project's `.eas/.env/`, and publish left them there. They now go to publish's temp folder and are deleted with it. A file that was already in `.eas/.env/` stays
- **The export's temp folder is deleted**: each publish left one per platform in the system's temp folder
- **No `EBADDEVENGINES` from npm**: the export runs your app's own Expo CLI with Node instead of `npx`, so npm no longer prints `EBADDEVENGINES` in a pnpm or bun workspace
