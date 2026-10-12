# @axonpack/in-app-updates

## 0.1.0

### Minor Changes

- 90a959f: - **Store version check**: find out if the App Store or Play Store has a newer version of your app
  - **Update modal**: a ready-made prompt with an icon, both versions and collapsible release notes, in light and dark mode
  - **Theming**: set the colours, corner radius, fonts, labels and icon of the modal
  - **Your own modal**: draw the prompt with your own components and keep the checking, skipping and refreshing
  - **Force updates**: block versions below a minimum, require every update, or only the big ones
  - **Skip this version**: people can skip a soft update, and it stays skipped until a newer version comes out
  - **Your own backend**: read the latest version from a JSON file or API, and fall back from one source to the next
  - **Version formats**: dates, four-part numbers, and beta and canary tags compare correctly, and you can supply your own comparison
  - **Fake a release**: try the whole flow in a development build without publishing anything
  - **Google Play in-app update**: on Android, update through Google's own update screen, then restart into the new version
  - **Hook**: keep the update state in a component, refreshed each time the app returns to the foreground
