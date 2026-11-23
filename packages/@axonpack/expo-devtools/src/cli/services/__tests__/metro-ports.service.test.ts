import { execFileSync } from 'node:child_process';

import { DEFAULT_PORTS, metroPorts } from '../metro-ports.service';

jest.mock('node:child_process', () => ({ execFileSync: jest.fn() }));
const run = execFileSync as unknown as jest.Mock;

const platform = process.platform;
const setPlatform = (value: string) => Object.defineProperty(process, 'platform', { value });

afterEach(() => {
  run.mockReset();
  setPlatform(platform);
  delete process.env.RCT_METRO_PORT;
});

it('adds RCT_METRO_PORT first and the ports node listens on after the defaults', () => {
  setPlatform('darwin');
  process.env.RCT_METRO_PORT = '7000';
  run.mockReturnValue('p123\nf20\nn*:9876\nf21\nn[::1]:8081\np456\nf18\nn127.0.0.1:3000\n');
  expect(metroPorts()).toEqual([7000, ...DEFAULT_PORTS, 9876, 3000]);
  expect(run).toHaveBeenCalledWith(
    'lsof',
    ['-nP', '-a', '-c', 'node', '-iTCP', '-sTCP:LISTEN', '-Fn'],
    expect.objectContaining({ timeout: 3000 })
  );
});

it('ignores an RCT_METRO_PORT that is not a port', () => {
  process.env.RCT_METRO_PORT = 'metro';
  run.mockReturnValue('');
  expect(metroPorts()).toEqual(DEFAULT_PORTS);
});

it('falls back to the defaults when lsof is missing or finds nothing', () => {
  setPlatform('linux');
  run.mockImplementation(() => {
    throw new Error('spawnSync lsof ENOENT');
  });
  expect(metroPorts()).toEqual(DEFAULT_PORTS);
});

it("reads node's listening ports from tasklist and netstat on Windows", () => {
  setPlatform('win32');
  run.mockImplementation((command: string) =>
    command === 'tasklist'
      ? '"node.exe","4242","Console","1","80,000 K"\r\n"node.exe","77","Console","1","9,000 K"\r\n'
      : [
          'Active Connections',
          '  Proto  Local Address          Foreign Address        State           PID',
          '  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       900',
          '  TCP    [::]:9876              [::]:0                 LISTENING       4242',
          '  TCP    127.0.0.1:5000         0.0.0.0:0              ABHÖREN         77',
          '  TCP    127.0.0.1:51000        140.82.112.3:443       ESTABLISHED     4242',
          '  UDP    0.0.0.0:5353           *:*                                    4242',
        ].join('\r\n')
  );
  expect(metroPorts()).toEqual([...DEFAULT_PORTS, 9876, 5000]);
});
