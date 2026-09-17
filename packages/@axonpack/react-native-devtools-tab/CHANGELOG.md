# @axonpack/react-native-devtools-tab

## 0.1.0

### Minor Changes

- e1a59b0: - **Your own tab in React Native DevTools**, beside Console and Sources, from one call to `registerTab`
  - **A tab is a React component** you write, with hooks, effects and anything it composes
  - **It runs inside the app**, so it reads the app's own state and a button in it calls the app's own functions
  - **No copy to keep in sync**: subscribe to a store and the tab redraws the moment that store changes
  - **Write the tab in React Native or in HTML**, whichever suits it, both drawn by the panel
  - **Name and symbol per tab**, and as many tabs as you register
  - **A bar above every tab** with its name and a button that draws it again
  - **One line in the Metro config** is the whole setup, with no fork of the DevTools frontend, no browser extension and no second window
  - **Nothing ships to production**: guard the registrations with `__DEV__` and a release bundle carries none of it
