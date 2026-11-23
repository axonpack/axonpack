export const DEFAULT_PORTS = Array.from({ length: 10 }, (_, i) => 8081 + i);

const LIST_TIMEOUT_MS = 3000;

/**
 * The ports to look on without `--port`: RCT_METRO_PORT, 8081 to 8090, then every port a node
 * process listens on, which finds a Metro started with `--port <n>`. findApps keeps only the ports
 * that answer `packager-status:running`, so an extra port costs one quick request and never a
 * wrong match.
 */
export function metroPorts(): number[] {
  const envPort = Number(process.env.RCT_METRO_PORT);
  return [
    ...new Set([...(envPort > 0 ? [envPort] : []), ...DEFAULT_PORTS, ...listeningNodePorts()]),
  ];
}

/** Empty when lsof or netstat is missing or fails, which leaves the ports above. */
function listeningNodePorts(): number[] {
  const { execFileSync } = require('node:child_process') as {
    execFileSync: (
      command: string,
      args: string[],
      options: { encoding: 'utf8'; stdio: string[]; timeout: number }
    ) => string;
  };
  const run = (command: string, args: string[]) =>
    execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: LIST_TIMEOUT_MS,
    });
  const port = (address: string) => Number(address.split(':').pop());
  try {
    if (process.platform === 'win32') {
      const pids = new Set(
        run('tasklist', ['/fi', 'imagename eq node.exe', '/fo', 'csv', '/nh'])
          .split(/\r?\n/)
          .map((line) => line.split('","')[1])
          .filter(Boolean)
      );
      // Not `-p tcp`, which leaves out the IPv6 list, where node's default `::` socket shows. A
      // listening socket is told by its foreign address ending in `:0`, since the LISTENING state
      // is translated on some Windows languages.
      return run('netstat', ['-ano'])
        .split(/\r?\n/)
        .map((line) => line.trim().split(/\s+/))
        .filter((cols) => cols[0] === 'TCP' && cols[2]?.endsWith(':0') && pids.has(cols[4]))
        .map((cols) => port(cols[1]))
        .filter((each) => each > 0);
    }
    // -c node: a command name starting with "node". -Fn: one `n<address>:<port>` line per socket.
    return run('lsof', ['-nP', '-a', '-c', 'node', '-iTCP', '-sTCP:LISTEN', '-Fn'])
      .split('\n')
      .filter((line) => line.startsWith('n'))
      .map(port)
      .filter((each) => each > 0);
  } catch {
    return [];
  }
}
