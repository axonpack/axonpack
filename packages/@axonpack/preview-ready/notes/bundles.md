# Bundles

Building a preview bundle, and which native build it can run on.

- [ ] Builds the same release bundle and images the native build would embed, for Android and iOS
- [ ] Names a preview after its branch, with a readable title QA sees
- [ ] Marks every preview with the native build it was made for, so an app only ever offers ones it can run

A preview is the output of `expo export:embed --bytecode`: Hermes bytecode plus the images next to
it, in the folders the native build uses. React Native finds images beside a bundle loaded from a
file, so nothing in JS has to map them.

Bytecode runs only on a build with the same native code and the same Hermes version. The key is the
`@expo/fingerprint` hash of the native side, the same thing expo-updates' fingerprint policy uses.
Any native change gives a new key, and older previews stop being offered.
