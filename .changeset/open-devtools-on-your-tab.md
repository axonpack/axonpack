---
"@axonpack/react-native-devtools-tab": minor
---

- **Open DevTools on your tab**: `registerTab` returns `focus()`, and the next DevTools window lands on that tab
- **Switch an open window to your tab**: `focus()` also brings the tab forward in a window that is already open
- **Copy to the computer's clipboard**: give an element `COPY_ATTRIBUTE` with the text, and a click copies it there instead of on the device
- **Your own right-click menu**: a tab that handles a right-click no longer gets the browser's menu on top of it
- **A clearer about card**: hover the mark by a tab's name for what it is and links to the docs, changelog, other libraries and GitHub
