# Play in-app updates

Updating through Google's own screen on Android, without sending people to the Play Store app.

- [x] A background download while the app keeps running, then an install that restarts the app
- [x] A full-screen update that installs and restarts the app
- [x] Tells what Play knows: whether an update is offered, its priority, how stale it is, and what is allowed
- [x] Shows download progress while a background update downloads
- [x] Picks the full-screen flow for a mandatory update and the background one otherwise
- [x] Falls back to the store link when Play has nothing to offer
- [x] Picks up a full-screen update the person left half done
- [x] Installs a background update that finished downloading while the app was closed
- [x] Does nothing, quietly, where the module is not linked or Play cannot answer

## What the design turns on

**It is a thin layer over Google's own library.** The package adds no screen of its own. Google's
dialog and update screen do the asking, and the package reports what happened.

**It is optional at every level.** The module declares no permissions. Expo Go, iOS, a sideloaded
build and a device without Play all end in a plain "unavailable", and the prompt opens the store.

## Won't do

- **An in-app update on iOS.** Apple has no API for it.
- **Test the real Play screens without Play.** They only appear for an app installed from Play, so
  a fake stands in for Play when testing the package's own code.
