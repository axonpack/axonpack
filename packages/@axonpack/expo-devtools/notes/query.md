# Query

The app's TanStack Query cache: every query and mutation, live, with buttons to push a query into
each state a screen has to handle.

## Features

- [x] Hand the app's own query client over in the config, with no new dependency
- [x] Lists queries with their key, status, observer count and when they last updated
- [x] Lists mutations with their key, status and when they were submitted
- [x] Updates live while the tab is open
- [x] Open a query to see its data or its error, and a mutation to see its variables too
- [x] Refetch, invalidate, reset or remove a query
- [x] Hold a query in loading or in error, and press again to put it back
- [x] The tab is left out of the panel when no client was handed over
- [ ] Search and filter the list
- [ ] Edit a query's data in place
- [ ] The same tab in React Native DevTools
- [ ] More than one client

## How it works

TanStack Query is not a dependency. The config takes the app's `QueryClient` the way the Storage tab
takes its stores, typed by shape, so an app without TanStack Query installs nothing and compiles.
The example app passes a real v5 client to that type, which is what keeps the shape honest. Only v5
is supported: v4 calls the loading status `loading` where v5 says `pending`, and forcing a state
writes the status by name.

The tab subscribes to both caches only while it is open. TanStack fires a cache event for every
fetch, and nothing reads the snapshot with the panel closed.

A forced state writes the query's state directly and keeps the state it replaced, so pressing the
same button again restores it. Loading sets `fetching` as well as `pending`, because v5's
`isLoading` needs both. While held there, a refetch from the app returns the last successful fetch
instead of starting a new one, so the screen stays loading until the button is pressed again. Every
other button puts the real state back first for the same reason. If the app fetched while a state
was held, pressing the button again still restores the older state; a refetch brings it up to date.

There is no clear button. In every other tab it drops a log, and here it would empty the app's cache.
