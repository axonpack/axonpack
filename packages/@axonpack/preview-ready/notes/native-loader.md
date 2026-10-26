# Native loader

Starting the app from a downloaded bundle, and getting back again.

- [ ] Starts the app from the chosen preview, with no change to the app's native code
- [ ] Switches to another preview or back to the base build with one restart
- [ ] Falls back to the base build when a preview crashes before it has started
- [ ] Works next to expo-updates, which keeps managing the base build
- [ ] Needs the New Architecture; under the old one it logs a warning and always loads the base build

Previews need React Native's New Architecture, the default from Expo SDK 53. Under the old one the
package never loads a preview: it logs one warning and the base bundle loads, so the app still
starts.

With no preview chosen, the package changes nothing at startup: expo-updates, or the bundle inside
the app, loads as usual.

expo-updates is placed ahead of every other module on both platforms, so this package can never be
asked first. On Android it still wins whenever expo-updates is running the embedded update. On iOS,
when expo-updates is active, the base bundle starts and the app then reloads straight into the
preview.
