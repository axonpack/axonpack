# The React Native DevTools tab is ours, not a plugin of somebody else's framework

The plan for this tab assumed we would ship as a plugin of an existing third-party framework, on the
grounds that the frontend injection is the fragile part and not worth writing. That was reversed
during the work. We wrote the injection. It is about 200 lines and it works.

## What the reversal bought

**No runtime dependency.** Being a plugin meant a framework in the consumer's `metro.config.js`, a
peer dependency for the device-side bridge, and our data passing through their transport. This
package's whole pitch is that it costs nothing to ship, and a second install to see a tab is a real
cost.

**No second debugger connection.** That framework's agent mode opens its own debugger connection, and
React Native permits one at a time, so using it disconnects React Native DevTools. Ours is the same
connection DevTools already has, so nothing is displaced.

**Our own domain name.** Messages are tagged `axonpack` on the Fusebox dispatcher rather than riding
somebody else's domain, which means the bridge's protocol is ours to change.

## The pieces

`src/metro/index.ts` is the whole dev-server side, in one file. It serves React Native DevTools'
own frontend from `/axonpack-devtools`, intercepts the entry page to add a nonce to its CSP and a
script tag, patches `getDevToolsFrontendUrl` in memory so the "open debugger" shortcut points at that
route, and serves the panel. The host script and the panel HTML are template strings in that same
file, so `tsc` stays the whole build and there are no assets to copy into `build/`.

`src/core/services/connect-devtools-panel.service.ts` is the device side, against
`__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__` directly. `startDevtools` calls it, so an app needs no line
of its own; it is another thing the one provider mount does, like every other capability here.

## Four things that cost time, worth not rediscovering

**`tsc` does not add extension specifiers.** The built entry is loaded by Node as ESM, where
`import './host.const'` does not resolve. Two files became one to remove the import rather than
manage extensions in a package whose other consumer is Metro.

**There is no ambient `require` in that module either**, for the same reason, so every lookup for a
dev-server package threw and was swallowed by a `catch`. It is built from
`createRequire(import.meta.url)` now, with the working directory as the base because Jest transforms
the file to CommonJS and `import.meta.url` is null there.

**`enhanceMiddleware`'s second argument is Metro's bundler server, not an `http.Server`.** There is
no `listeners` on it and no way to take over dispatch through it. The middleware chain is the hook,
and under Expo it does run early enough; an earlier conclusion that it does not was wrong, and came
from probing a module that was failing to load.

**`@react-native/debugger-frontend`'s files are not at its package root.** Its entry exports the
directory, several levels down, and requiring it is the only supported way to learn that path.
Resolving the package root and serving from there returns 404 for everything.

## Left open

The panel shows store names and row counts, not the real tabs. Reusing the existing React Native
components on the web through `react-native-web` is the next step and is untouched. The bridge's
detail path (`request-detail` to fetch a body) has unit tests and no caller yet.
