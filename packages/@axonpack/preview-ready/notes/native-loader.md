# Native loader

Starting the app from a downloaded bundle, and getting back again.

- [ ] Starts the app from the chosen preview, with no change to the app's native code
- [ ] Switches to another preview or back to the base build with one restart
- [ ] Works in debug builds too: a chosen preview loads instead of Metro, and going back to the base build returns to Metro
- [x] Falls back to the base build when a preview crashes before it has started
- [ ] Works next to expo-updates, which keeps managing the base build
- [ ] Needs the New Architecture; under the old one it logs a warning and always loads the base build

Previews need React Native's New Architecture, the default from Expo SDK 53. Under the old one the
package never loads a preview: it logs one warning and the base bundle loads, so the app still
starts.

In a debug build the base is whatever Metro serves. While a preview is chosen it loads from the
device and Metro is not asked; going back to the base reloads from Metro.

If a preview fails before the app has mounted, it is marked broken and the base bundle loads. On
Android that happens straight away: the app restarts into the base bundle. On iOS the failed preview
leaves a blank screen until the app is closed and opened again, and that next start is the base
bundle. Errors that do not come from a starting preview are thrown on as usual, so the app behaves as
it would without this package.

With no preview chosen, the package changes nothing at startup: expo-updates, or the bundle inside
the app, loads as usual.

expo-updates is placed ahead of every other module on both platforms, so this package is never
asked first. On Android a chosen preview is also put straight into React's host, in the private
field expo-dev-launcher uses, so it wins even after expo-updates has applied a downloaded update; if
that field is missing, the base loads and a warning says why. On iOS, while expo-updates is active,
the base bundle starts and the app reloads once straight into the preview. Going back to the base
hands the start back to expo-updates.

## Testing next to expo-updates

The example leaves expo-updates out, so its default setup stays small. To try the two together:

1. In `example/`, run `npx expo install expo-updates`.
2. Add to `app.json` under `expo`, so expo-updates is on in release builds but never asks the
   network and always starts its embedded update:
   ```json
   "runtimeVersion": "1.0.0",
   "updates": {
     "url": "https://localhost.invalid/preview-ready-example",
     "checkAutomatically": "NEVER",
     "fallbackToCacheTimeout": 0
   }
   ```
3. `npx expo prebuild`, then a release build: `npx expo run:android --variant release` or
   `npx expo run:ios --configuration Release`.
4. With no preview chosen, the app shows the embedded bundle. Choose a preview: it loads, and again
   after closing and reopening the app. Go back to the base: the embedded bundle loads.
5. To check the case where expo-updates has applied a downloaded update, point `updates.url` at a
   real update server (EAS Update, or your own), publish an update, let the app apply it, then
   repeat step 4. Going back to the base should load that update.
