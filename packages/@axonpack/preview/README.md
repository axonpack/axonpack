<div align="center">

<img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/expo-devtools/docs/logo.png" width="88" alt="Axonpack" />

# @axonpack/preview

**Hand QA the JS of every pull request, inside the build they already have.**

Publish one JS bundle per branch to your own S3-compatible bucket. QA opens a list in the app,
picks a preview, and the app restarts into it. No native rebuild, no new install, and the default
bundle comes back with one tap. Like EAS Update or CodePush, but only for previews.

**[Documentation](https://axonpack.dev/docs/preview)** · [Quick start](https://axonpack.dev/docs/preview/quick-start) · [CLI](https://axonpack.dev/docs/preview/cli) · [Changelog](https://axonpack.dev/docs/preview/changelog)

[![npm version](https://img.shields.io/npm/v/@axonpack/preview.svg)](https://www.npmjs.com/package/@axonpack/preview)
[![npm downloads](https://img.shields.io/npm/dm/@axonpack/preview.svg)](https://www.npmjs.com/package/@axonpack/preview)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/axonpack/axonpack/blob/main/LICENSE)

<table>
  <tr>
    <td width="50%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/preview/docs/screenshots/list-header-servers.png" width="220" alt="The header card for a dev preview server, then the dev preview servers in one grouped card" /></td>
    <td width="50%"><img src="https://raw.githubusercontent.com/axonpack/axonpack/main/packages/@axonpack/preview/docs/screenshots/list-published-previews.png" width="220" alt="Published previews with status and environment chips, changelogs, and Delete, Switch and Update" /></td>
  </tr>
  <tr>
    <td>What runs now, and every Metro server for the app, switched with a tap.</td>
    <td>The previews for this build, with their state, environment and changelog.</td>
  </tr>
</table>

</div>

## Installation

```sh
npx expo install @axonpack/preview expo-file-system
```

It needs React Native's New Architecture, which means Expo SDK 53 or later. Under the old
architecture the package logs one warning and always loads the default bundle, so the app still
starts. It has native code, so it runs in a development or release build, not in Expo Go.

## Setup

Add the config plugin to `app.json`, then run a prebuild or a new native build:

```json
{
  "expo": {
    "plugins": [["@axonpack/preview", { "compatibility": "appVersion" }]]
  }
}
```

The plugin bakes a key into the build. The app lists only previews published under that key.
`appVersion` (the default) keys on the app version; `fingerprint` keys on the native fingerprint.

Wrap the app in the provider and put the list on a screen QA can reach:

```tsx
import { PreviewList, PreviewProvider } from "@axonpack/preview";

export default function App() {
  return (
    <PreviewProvider
      config={{
        enabled: true,
        s3Config: { url: process.env.EXPO_PUBLIC_PREVIEW_S3_URL ?? "" },
      }}
    >
      <PreviewList style={{ flex: 1 }} />
    </PreviewProvider>
  );
}
```

`PreviewList` is a plain component, so it can also go in a tab, a stack screen, a `Modal` or a
bottom sheet, anywhere under the provider. See
[Show the list anywhere](https://axonpack.dev/docs/preview/app-setup#show-the-list-anywhere).

Publish the current branch from the app's root. The bucket and the write key come from the
environment, or from a gitignored `.env.local`:

```sh
PREVIEW_S3_URL=https://<account>.r2.cloudflarestorage.com/previews \
PREVIEW_S3_ACCESS_KEY_ID=... PREVIEW_S3_SECRET_ACCESS_KEY=... \
npx preview publish
```

The write key is for publishing only. Never put it in the app: the app gets the bucket's public
address, or a read-only key for a private bucket.

## Documentation

Everything else is on the docs site.

| Page                                                                         | What is on it                                                           |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [Quick start](https://axonpack.dev/docs/preview/quick-start)                 | From an empty bucket to switching previews in the app                   |
| [Storage](https://axonpack.dev/docs/preview/storage)                         | Public or private bucket, and the write and read keys                   |
| [AWS S3](https://axonpack.dev/docs/preview/aws-s3)                           | A bucket, a policy and both keys on AWS                                 |
| [Cloudflare R2](https://axonpack.dev/docs/preview/cloudflare-r2)             | A bucket, a public address and both keys on R2                          |
| [MinIO](https://axonpack.dev/docs/preview/minio)                             | Your own server on a VPS, or the local one for trying it out            |
| [Settings and env files](https://axonpack.dev/docs/preview/environment)      | Where the publish settings and the app's settings come from, and EAS    |
| [Publishing](https://axonpack.dev/docs/preview/publishing)                   | Publish, replace, unpublish and prune                                   |
| [CI](https://axonpack.dev/docs/preview/ci)                                   | Publish every pull request with GitHub Actions                          |
| [Compatibility](https://axonpack.dev/docs/preview/compatibility)             | The config plugin, and app version or fingerprint                       |
| [App setup](https://axonpack.dev/docs/preview/app-setup)                     | The provider, the list and its theme, your own screen, and the status   |
| [Dev preview servers](https://axonpack.dev/docs/preview/dev-preview-servers) | Several Metro servers, one per worktree, switched live in a debug build |
| [expo-updates](https://axonpack.dev/docs/preview/expo-updates)               | How previews sit on top of a build that expo-updates manages            |
| [Troubleshooting](https://axonpack.dev/docs/preview/troubleshooting)         | An empty list, a failed download, and what to check                     |
| [CLI](https://axonpack.dev/docs/preview/cli)                                 | Every command and option                                                |
| [Reference](https://axonpack.dev/docs/preview/reference)                     | Every export, config field, label and theme token                       |
| [Changelog](https://axonpack.dev/docs/preview/changelog)                     | Every published release, also in [`CHANGELOG.md`](./CHANGELOG.md)       |

## Example app

`example/` is the default `create-expo-app` template with the list on a Previews tab and a banner
on every tab that says what runs. It publishes to a local MinIO, so it needs no cloud account:

```sh
bun run storage:local                       # MinIO in Docker or Podman
cp example/.env.example example/.env
cp example/.env.local.example example/.env.local
cd example && npx expo run:ios              # or: npx expo run:android
bun run publish:preview --id task-1-login-fix
```

The whole run, with the device setup for each platform, is in
[the testing note](https://github.com/axonpack/axonpack/blob/main/packages/@axonpack/preview/notes/testing.md).

## What's built, and what isn't

See [the feature list](https://github.com/axonpack/axonpack/blob/main/packages/@axonpack/preview/notes/README.md) for what's built, what the platform genuinely can't do (and why this
doesn't fake it), and what's still on the table.
