/**
 * Experiment: the one thing a DevTools tab cannot do for itself.
 *
 * The panel is a browser iframe and the app is Hermes, so neither can spawn a process. Metro is the
 * only Node in the loop, and this file is already extending it, so the command runs here and the
 * tab's Run button is just a message that ends up at a fetch.
 *
 * This is an experiment, not something to ship. It is a shell on your machine over HTTP.
 */
const { exec } = require("node:child_process");

const ROUTE = "/exec-experiment/run";

function run(request, response) {
  // A JSON content type is not a simple request, so a page you happen to have open has to pass a
  // CORS preflight first. Thin, but better than every tab on the web having a shell.
  if (request.headers["content-type"] !== "application/json") {
    response.statusCode = 415;
    response.end("send JSON");
    return;
  }

  let body = "";
  request.on("data", (chunk) => {
    body += chunk;
  });
  request.on("end", () => {
    let cmd;
    try {
      cmd = JSON.parse(body).cmd;
    } catch {
      response.statusCode = 400;
      response.end("bad JSON");
      return;
    }

    // A hung command would otherwise hold the connection open for as long as Metro lives.
    exec(cmd, { timeout: 10_000 }, (error, stdout, stderr) => {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ stdout, stderr, code: error?.code ?? 0 }));
    });
  });
}

/** Runs what the Shell tab posts. Compose it over the devtools plugin. */
function withExecExperiment(config) {
  const previous = config.server?.enhanceMiddleware;

  return {
    ...config,
    server: {
      ...config.server,
      enhanceMiddleware: (middleware, server) => {
        const next = previous ? previous(middleware, server) : middleware;

        return (request, response, done) => {
          if ((request.url ?? "").split("?")[0] !== ROUTE)
            return next(request, response, done);
          run(request, response);
        };
      },
    },
  };
}

module.exports = { withExecExperiment };
