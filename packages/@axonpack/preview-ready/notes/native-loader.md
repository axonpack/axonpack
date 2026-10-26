# Native loader

Starting the app from a downloaded bundle, and getting back again.

- [ ] Starts the app from the chosen preview, with no change to the app's native code
- [ ] Switches to another preview or back to the base build with one restart
- [ ] Works in debug builds too: a chosen preview loads instead of Metro, and going back to the base build returns to Metro
- [ ] Falls back to the base build when a preview crashes before it has started
- [ ] Works next to expo-updates, which keeps managing the base build
- [ ] Needs the New Architecture; under the old one it logs a warning and always loads the base build

Previews need React Native's New Architecture, the default from Expo SDK 53. Under the old one the
package never loads a preview: it logs one warning and the base bundle loads, so the app still
starts.

In a debug build the base is whatever Metro serves. While a preview is chosen it loads from the
device and Metro is not asked; going back to the base reloads from Metro.

With no preview chosen, the package changes nothing at startup: expo-updates, or the bundle inside
the app, loads as usual.

expo-updates is placed ahead of every other module on both platforms, so this package can never be
asked first. On Android it still wins whenever expo-updates is running the embedded update. On iOS,
when expo-updates is active, the base bundle starts and the app then reloads straight into the
preview.
