# Bundles

Building a preview bundle, and which native build it can run on.

- [x] Builds the same release bundle and images the native build would embed, for Android and iOS
- [x] Names a preview after its branch, with a readable title QA sees
- [x] Marks every preview with the native build it was made for, so an app only ever offers ones it can run
- [x] Lets the developer match previews to builds by app version (the default) or by native fingerprint

A preview is the output of `expo export:embed --bytecode`: Hermes bytecode plus the images next to
it, in the folders the native build uses. React Native finds images beside a bundle loaded from a
file, so nothing in JS has to map them.

Bytecode runs only on a build with the same native code and the same Hermes version. Each build
gets a key, and the app lists only previews published under its own key. The developer picks how
the key is made, with one option in the app config that the build and `publish` both read:

```json
"plugins": [["@axonpack/preview-ready", { "compatibility": "appVersion" }]]
```

| `compatibility`        | Key                     | Pick it when                                                                                               |
| ---------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `appVersion` (default) | `version-<app version>` | You bump the version for every native change. Simple, and readable in the bucket                           |
| `fingerprint`          | `fingerprint-<hash>`    | Native changes can land without a version bump. Exact, the same hash expo-updates' fingerprint policy uses |

The trade-off of `appVersion`: a native change without a version bump is not detected, so a preview
built on the old native code is still offered. Two things catch most of the damage: a preview whose
Hermes bytecode version differs from the build's is not loaded, and a preview that fails while
starting falls back to the base bundle and is marked broken. `publish` prints a one-line warning in
this mode. With `fingerprint`, any native change (a new native dependency, a config plugin change,
a prebuild with different settings) makes older previews incompatible.

A preview chosen on one build is not started by a later build with another key; the app starts the
base bundle and the download moves to Incompatible.
