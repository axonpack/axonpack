---
"@axonpack/expo-devtools": minor
---

## ✨ Features

- The Performance tab is now split into sections you pick from the toolbar — Statistics, User timing, Interactions, Long tasks and Limiter — instead of everything sharing one long screen.
- Only the section you are looking at is drawn, so the tab is lighter on older phones and the graphs no longer redraw while you read a list.
- The Limiter, for freezing the app on purpose, is now one of those sections rather than a panel that opened over everything else.
- Every list tells you when recording is off, and offers to start it, instead of looking empty.
- Long tasks now lists the freezes worth acting on: anything over 150 milliseconds, rather than 50. You can still ask for the shorter ones.

## 📝 Documentation

- A new reference page explains every tab, section, button and field in the panel, alongside the full list of settings.
- Setting the tools up in an app that uses Expo Router is now written up, with where to start them and where to put the button.
- Three settings were documented under the wrong name or the wrong default. The page now matches what the code actually does.
