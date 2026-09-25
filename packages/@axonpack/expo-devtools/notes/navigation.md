# Navigation

The screens the app moved through, what the navigator holds right now, and a way to move it from
the panel.

## Features

- [x] The tab is there only when a router is installed; an app without one never sees it
- [x] With Expo Router, the tab finds the navigator on its own; nothing to wire
- [x] With React Navigation, nothing to wire when the provider sits inside the container; one line
      when it sits above, and that line names the container
- [x] The current route, with its path and its params
- [x] The whole navigator state as a tree: every stack and tab, and what is on top of each
- [x] A history of moves: when, which action, from where to where, with the params
- [x] Where in your own code each move was dispatched from, with the source around the line
- [x] How long each screen stayed on top
- [x] Search the history, pause recording, clear it
- [x] Go back, from the panel
- [x] Navigate to a route by name, with params typed in
- [x] Suggests the routes it knows as you type the name, and fills in the params it last had
- [x] Open a deep link
- [x] Go to a past screen again, from its history row, with the same params
- [x] Rewrite or drop a move before it is stored, so a token in a param never lands in the log
- [x] Export as JSON, copy as Markdown
- [x] Says which router it found and how to finish wiring it, when it is still waiting
- [x] Several containers at once, each named, every move filed under its container, one in focus for
      the toolbar

## What it can find on its own, and what it cannot

This package takes no router dependency, for the reason the Storage tab takes no storage library:
`expo-router` and `@react-navigation/native` are separate installs, and taking either one on would
force it on every consumer. What it does instead is ask whether one is there, and then reach the
container by whichever of three ways the app's layout allows.

**Asking is a `require` inside a `try`, at module scope.** Metro resolves every `require` when it
bundles, and a package it cannot find normally fails the build. Expo's Metro config turns on
`allowOptionalDependencies`, under which a `require` whose statement sits directly inside a `try`
block is marked optional: a missing package becomes a throw at that call instead of a build error.
So the package tries `expo-router`, then `@react-navigation/native`, and catches the miss. Three
conditions on that. The call has to sit in the `try` block itself, not in a helper the block
calls, since Metro looks at the statement around the call and nothing deeper. It has to run at
module scope, not later from a function: Metro's runtime wraps a `require` made while no module
is initialising in a guard that reports a failing load as a fatal error instead of throwing it, so
a router installed but unable to load, one whose native modules are not in the binary, would put
a red box on screen rather than land in the `catch`. And a bare Metro config has the flag off,
which does not matter here because this package already needs Expo. Neither router is declared as
a peer dependency, even an optional one: bun installs an optional peer it can find in the
workspace, which put an Expo Router this example never uses next to the package, where Metro then
found it.

**Three layouts, and only one of them has a line to write.**

- **Expo Router.** Its container ref lives in a module-level store, and its public
  `useNavigationContainerRef` returns that ref as is, reading no context. The start takes it without
  the app doing anything, wherever the provider sits.
- **React Navigation, container around the provider.** The library keeps no global, but it puts the
  container itself into context for everything it renders. A small component the provider mounts
  reads that context and attaches, with no ref and no hook. This is the example app.
- **React Navigation, container inside the provider.** Nothing above a container can see it, so the
  app hands the ref over: `useDevtoolsNavigation(ref)` in the component that owns the container,
  the way `useDevtoolsWebView` hands a WebView its props.

The tab records which of the three it is running on and says so under the route on screen, so a
setup question has an answer without reading code. In every case the ref can be empty when first
seen, so the tab waits on it rather than giving up, and a container whose navigator mounts later is
listened to from the start and reports its first state when one does.

**Both routers hand over the same ref.** The current Expo Router ships its own copy of React
Navigation's core rather than depending on it, which is why an Expo Router app may have no
`@react-navigation/*` package at all, and why the check tries Expo Router first. The ref has the
same methods and fires the same events in both copies, and the tab touches nothing else, so which
copy is underneath does not matter.

**The tab hides itself when no router is found.** Storage always shows, with its setup code,
because nothing can tell whether the app has a store to register. Here the `require` answers that
question, and an app with no router has nothing the tab could ever show. Both tab bars read the
same flag. Expo Router installed but not the app's router leaves the tab waiting for a container
that never mounts, and the tab says so.

## Decisions worth knowing

- **Containers are named, and all of them are followed.** The one found on its own, by context or
  by Expo Router, is `root`; the hook names the rest, and defaults to `root` for the app whose one
  container sits inside the provider. Every move is filed under its container, the row and the
  export say which once there is more than one, and the filter panel narrows to one. One container
  is in focus at a time: the one that moved last, or the one picked on the route card. The card
  shows its route and how it was reached, and Go back and Navigate act on it; a row's "go here
  again" acts on the row's own container. A name handed over twice is one container, and the later
  attachment replaces the earlier.
- **Two gates, as everywhere.** `navigation.disabledByDefault` sets `paused`, never `enabled`, and
  the record button in the toolbar is what flips it back.
- **A stream store.** Moves arrive continuously, so the store is a ring buffer with a batched
  notify, the shape of the network and console logs, capped the same way. The navigator state
  itself is not in the ring: it is one object, replaced on every change.
- **The action comes from an event React Navigation marks unsafe.** The public `state` listener
  hands over the new state and nothing else. The action that caused it rides on a second event,
  named as unsafe, that fires just before. React Navigation's own devtools pair the two, and so
  does this tab: the action is held until the state event that follows it, and a state change with
  no action ahead of it is logged as unknown. An action that changed nothing, such as navigating to
  the screen already on top, is still a row, marked as such, because the app did ask for it. There
  is no state diffing: the event says push, replace, go back or jump in the app's own words.
- **The origin is a call stack that same event carries in development.** React Navigation attaches
  the stack of the dispatching call to the action event in a development build. As with the
  Network tab's initiator, the stack is kept cheaply and read expensively: it is stored as text
  with the row, and source-mapped through the dev server only when the row is opened, by the
  shared symbolication service the crash and console tabs already use. The origin is the first
  frame outside `node_modules`; when every frame is inside one, the top frame is shown and marked
  as a guess. No dev server means the raw stack and a line saying why.
- **Time on screen is derived, never stored.** It is the gap to the next move, so the last row is
  still counting. Storing it would mean rewriting a row when the next one arrives.
- **Renders per visit are the Performance tab's number.** When the app has handed its navigators
  the screen layout the performance note describes, a history row also says how many times the
  screen rendered while it was on top and how long that took. Nothing here counts anything: the
  row reads that store by route, between the visit's start and its end.
- **Redaction runs before the store.** A param is where a magic link's token or an OAuth code ends
  up. `navigation.redact` gets the entry first, the way `network.redact` and `crash.redact` do,
  because breadcrumbs, the export and the DevTools tab all read from the store, and a value that
  reached it has already left the panel's control.
- **A path only exists where linking does.** Expo Router sets one on every route, so its rows show
  the URL path beside the route name, which for it is the file segment. A React Navigation app
  without linking configured shows the name alone, and the tab does not invent a path for it.
- **Navigating from the panel runs the real navigator.** Go back, navigate, open a link and go
  again all go through the ref's own methods, so the app sees the move exactly as it sees its own,
  and nothing is imported from React Navigation to do it. The panel holds no navigation state of
  its own to drift from.
- **The ref is typed by what the tab calls.** As with the storage drivers, the ref is a duck type
  naming the handful of methods above, so neither router is needed to compile the package. The
  example app installs the real library, which is what keeps that type honest.
- **The crash report is the crash note's.** Its line about capturing the current route is filled
  from this store, and moves join console and network as breadcrumbs. The app no longer has to set
  the route through the crash context by hand.
- **The example app is a React Navigation app at its root.** The container wraps the app and the
  provider sits inside it, so the demo is a stack navigator and nothing else: no ref, no hook. The
  navigator mounts only in its tab, which is what exercises a container found before it has any
  state. A Checkout screen in that stack carries a container of its own, an independent tree
  handed over with the hook, so both layouts run at once and the switch between them can be
  watched on the route card. Installing the real library in the example is also
  what typechecks the duck-typed container against it. The Expo Router path is built against that
  package's source and has not yet been run in an Expo Router app; the example is not one.

## Won't do

- **Restoring a past navigator state.** React Navigation's own devtools can reset the navigator to
  any logged state and drop the moves after it. The navigator would go back and the rest of the
  app would not: a query cache, a form draft, a user who has since signed out. Going to a screen
  again runs the app's own navigation instead, and the app can refuse.
- **Finding a React Navigation container from above it.** The library keeps no record of where a
  container was mounted; from inside, context is that record, and that is the only way in.
- **Editing the state tree in place.** Same reason as the first: a state the app did not produce is
  a state it has no code for.
