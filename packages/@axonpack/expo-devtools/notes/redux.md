# Redux

The actions a Redux store reduced, what each one changed, and a way to dispatch one from the panel.

## Features

- [x] The tab is there only when the app's store was created with the enhancer
- [x] Works with Redux Toolkit's `configureStore` and with plain `createStore`
- [x] A list of actions: type, time and payload
- [x] Open an action to see it, the state after it, and a diff against the state before
- [x] The current state of the store as a tree
- [x] Dispatch an action typed as JSON, or a recorded one again
- [x] Allow and deny lists by action type, exact or by pattern, set in the config
- [x] Stop recording a type from the panel, and take it back off the list
- [x] Search the list, pause recording, clear it
- [ ] Redact values from an action or the state before they are stored
- [ ] The same tab inside React Native DevTools
- [ ] Export as JSON, copy as Markdown

## How it gets the actions

This package takes no redux dependency, for the reason the Storage tab takes no storage library.
The app adds a store enhancer to the store it already creates. The enhancer wraps the store's
`dispatch`: it reads the state, passes the action on, reads the state again, and hands all three
to the tab's store. Until the provider has started with `enabled: true` it only passes actions on,
so shipping it to production costs one function call per dispatch.

**It goes after `applyMiddleware`.** Redux Toolkit puts the middleware enhancer first in
`getDefaultEnhancers()`, so `concat` places this one inside it, next to the reducer. From there it
sees every plain action that reaches the reducer, including the ones a thunk dispatches, and none
of the functions the thunk middleware already handled. Placed outside the middleware instead, it
would see the thunk function and miss what the thunk dispatched, because middleware dispatches
through its own chain.

## Decisions worth knowing

- **States are held by reference.** Redux never mutates a state, so the row keeps the object the
  reducer returned and the one before it. Nothing is copied or serialised when an action arrives.
- **The diff is worked out when a row is opened, not when it is recorded.** It walks both states
  and skips any branch whose reference did not change, which is what immutable updates make cheap.
  It stops at 200 changes, since an action that replaces a whole slice is not readable past that.
  A row whose reducer returned the same object says "no change" without diffing at all.
- **The current state is read live from the store.** It follows every action, paused or filtered
  out, the way the Navigation tab's route follows every move.
- **The deny list wins over the allow list.** A type allowed by a broad pattern can still be
  dropped by name, which is the case the panel's "stop recording this type" button serves.
- **Dispatching from the panel skips middleware placed outside the enhancer.** The enhancer only
  holds the store underneath that middleware. The reducer runs and the row is recorded, but a
  saga or a listener middleware does not see the action.
- **One store.** A second store created with the enhancer replaces the first in the tab.
- **The example app's Redux tab is a Redux Toolkit store.** It has a counter, a todo list for
  nested diffs, a thunk, a ticker that fires an action 20 times a second to deny from the panel, and
  an `analytics/*` action the config denies. Installing the real toolkit there is what typechecks
  the enhancer against it.
- **A stream store.** Actions arrive continuously, so the store is a ring buffer of 200 with a
  batched notify, the shape of the navigation and console logs.

## Won't do

- **Time travel.** The Redux DevTools extension can jump the store to any past state. The store
  would go back and the rest of the app would not: a request in flight, a screen already left.
