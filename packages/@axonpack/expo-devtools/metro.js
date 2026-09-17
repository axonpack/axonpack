/**
 * The Metro half of this package: one line in `metro.config.js` and the panel page is served.
 *
 * Plain CommonJS on purpose, and not compiled. `metro.config.js` is loaded by Node with `require`,
 * and everything else here is built by `tsc` into ES modules for Metro to bundle. Keeping this file
 * out of that build is what stops the two conventions meeting.
 */
const fs = require('node:fs');
const path = require('node:path');

/** Where this package's own panel page is served from. */
const ROUTE = '/axonpack-panel';

const TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

/**
 * Serves the Axonpack panel page from the dev server.
 *
 * ```js
 * // metro.config.js
 * const { getDefaultConfig } = require('expo/metro-config');
 * const { withDevtools } = require('@axonpack/expo-devtools/metro');
 *
 * module.exports = withDevtools(getDefaultConfig(__dirname));
 * ```
 */
function withDevtools(config) {
  const panel = path.join(__dirname, 'dist/panel');
  const previous = config.server && config.server.enhanceMiddleware;

  return {
    ...config,
    server: {
      ...config.server,
      enhanceMiddleware: (middleware, server) => {
        const next = previous ? previous(middleware, server) : middleware;

        return (request, response, done) => {
          const url = (request.url || '').split('?')[0];
          if (!url.startsWith(ROUTE)) return next(request, response, done);

          const rest = url.slice(ROUTE.length) || '/index.html';
          // Joined against the panel root and checked, so a crafted path cannot read outside it.
          const file = path.join(panel, path.normalize(rest));
          if (!file.startsWith(panel)) {
            response.statusCode = 403;
            return response.end('no');
          }

          fs.readFile(file, (error, contents) => {
            if (error) {
              response.statusCode = 404;
              return response.end('not found');
            }
            response.setHeader(
              'Content-Type',
              TYPES[path.extname(file)] || 'application/octet-stream'
            );
            response.end(contents);
          });
        };
      },
    },
  };
}

module.exports = { withDevtools, PANEL_ROUTE: ROUTE };
