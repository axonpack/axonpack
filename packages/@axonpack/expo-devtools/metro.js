/**
 * The Metro half of this package: one line in `metro.config.js` and the devtools tab is served.
 *
 * Plain CommonJS on purpose, and not compiled. `metro.config.js` is loaded by Node with `require`,
 * and everything else here is built by `tsc` into ES modules for Metro to bundle. Keeping this file
 * out of that build is what stops the two conventions meeting.
 *
 * There is nothing of our own to serve. The tab is this package's own panel, running in the app, so
 * the whole Metro side is the wrap that hosts it, re-exported under the name this package documents.
 */
const { withReactNativeDevtoolsTab } = require('@axonpack/react-native-devtools-tab/metro');

/**
 * Serves the Axonpack tab from the dev server.
 *
 * ```js
 * // metro.config.js
 * const { getDefaultConfig } = require('expo/metro-config');
 * const { withDevtools } = require('@axonpack/expo-devtools/metro');
 *
 * module.exports = withDevtools(getDefaultConfig(__dirname));
 * ```
 */
module.exports = { withDevtools: withReactNativeDevtoolsTab };
