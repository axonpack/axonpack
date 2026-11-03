import { HELP } from './constants/help.const';
import { NO_REPLY, agentCall, evaluate } from './services/evaluate.service';
import { DEFAULT_PORTS, findApps, pickApp, type App } from './services/find-apps.service';
import { parseArgv, type CliArgs } from './utils/parse-argv.util';
import type { AgentHello } from '../agent/services/install-agent.service';
import type { AgentQuery } from '../agent/utils/run-query.util';

const TIMEOUT_MS = 5000;
const WAIT_MS = 200;
const WAIT = '# wait: ';
// The first with a built-in WebSocket, which is what can send the Origin header Metro asks for.
const MIN_NODE = 22;

export function nodeVersionError(version: string): string | undefined {
  if (Number(version.split('.')[0]) >= MIN_NODE) return undefined;
  return `devtools needs Node ${MIN_NODE} or newer, and this is Node ${version}.`;
}

/**
 * Runs one command and returns its exit code: 0 ok, 1 an `error:` reply, not found or no reply, 2
 * no app to ask. Never throws.
 */
export async function main(
  argv: readonly string[],
  nodeVersion = process.versions.node
): Promise<number> {
  const tooOld = nodeVersionError(nodeVersion);
  if (tooOld) return fail(1, tooOld);
  try {
    return await command(parseArgv(argv));
  } catch (error) {
    return fail(1, error instanceof Error ? error.message : String(error));
  }
}

async function command(args: CliArgs): Promise<number> {
  const [name, ...rest] = args.words;
  if (args.help || name === undefined || name === 'help') {
    const known = name === 'apps' || name === 'topics' || name === 'get';
    print(known ? HELP[name] : name === undefined || name === 'help' ? HELP.main : HELP.query);
    return 0;
  }
  const usage =
    name === 'get'
      ? rest.length !== 2 && 'devtools get <topic> <id>'
      : rest.length > 0 && `devtools ${name}`;
  if (usage) return fail(1, `usage: ${usage}. See devtools ${name} --help`);

  const apps = await findApps(args.port ? [args.port] : DEFAULT_PORTS);
  if (apps.length === 0) {
    const ports = args.port ? `port ${args.port}` : 'ports 8081 to 8090';
    return fail(
      2,
      `no app found on Metro ${ports}. Open the app in a dev build with \`expo start\` running, or pass --port.`
    );
  }
  if (name === 'apps') return listApps(apps, args);

  const app = pickApp(apps, { app: args.app, device: args.device });
  if (typeof app === 'string') return fail(2, app);
  if (!app.multipleDebuggers && !args.force) {
    return fail(
      2,
      `${label(app)} can't share its debugger (React Native below 0.86, or Expo started headless), so attaching would close a DevTools window open on it. Pass --force to attach anyway.`
    );
  }

  if (name === 'topics') return listTopics(app, args);
  const query: AgentQuery =
    name === 'get'
      ? { ...args.query, topic: rest[0], get: rest[1] }
      : { ...args.query, topic: name };
  // A file gets the reply whole.
  if (args.out) query.full = true;
  return ask(app, query, args.out);
}

/** Asks again on `# wait:`, which a topic still reading (storage keys, values) answers with. */
async function ask(app: App, query: AgentQuery, out?: string): Promise<number> {
  const deadline = Date.now() + TIMEOUT_MS;
  let waitingFor: string | undefined;
  for (;;) {
    const reply = await evaluate(app, agentCall('run', query), deadline - Date.now());
    if (reply === NO_REPLY) return fail(1, waitingFor ? stillWaiting(waitingFor) : noReply(app));
    if (reply == null) return fail(2, noAgent(app));
    const text = String(reply);
    if (!text.startsWith(WAIT)) return answer(app, query, text, out);
    waitingFor = text.slice(WAIT.length);
    if (deadline - Date.now() <= WAIT_MS) return fail(1, stillWaiting(waitingFor));
    await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
  }
}

function answer(app: App, query: AgentQuery, reply: string, out?: string): number {
  if (reply.startsWith('error:')) {
    print(reply);
    return 1;
  }
  // The app does not know which app or device it is to Metro.
  const text = reply.replace(
    /^# (\S+) · /,
    (_, topic: string) => `# ${topic} · ${app.slug} · ${app.device} · `
  );
  if (!out) {
    print(text);
    return 0;
  }
  const { writeFileSync } = require('node:fs') as {
    writeFileSync: (path: string, data: string) => void;
  };
  writeFileSync(out, `${text}\n`);
  print(`# ${query.topic}: wrote ${text.length} chars to ${out}`);
  return 0;
}

async function listApps(apps: readonly App[], args: CliArgs): Promise<number> {
  const rows = await Promise.all(
    apps.map(async (app) => {
      const row = {
        app: app.slug,
        name: app.name ?? null,
        device: app.device,
        devtools: '?',
        metro: app.port,
        note: null as string | null,
      };
      if (!app.multipleDebuggers && !args.force) {
        return {
          ...row,
          note: "can't share its debugger: --force closes its open DevTools window",
        };
      }
      try {
        const hello = await evaluate(app, agentCall('hello'), TIMEOUT_MS);
        if (hello === NO_REPLY) {
          return { ...row, note: 'no reply in 5 s: JS may be paused at a breakpoint' };
        }
        return { ...row, devtools: (hello as AgentHello | null)?.version ?? '-' };
      } catch (error) {
        return { ...row, note: (error as Error).message };
      }
    })
  );
  printTable(rows, args.query.json);
  return 0;
}

async function listTopics(app: App, args: CliArgs): Promise<number> {
  const hello = (await evaluate(app, agentCall('hello'), TIMEOUT_MS)) as
    AgentHello | null | typeof NO_REPLY;
  if (hello === NO_REPLY) return fail(1, noReply(app));
  if (hello == null) return fail(2, noAgent(app));
  if (!args.query.json) print(`# topics · ${app.slug} · ${app.device}`);
  printTable(
    hello.topics.map((topic) => ({
      topic: topic.name,
      rows: topic.rows ?? 'off',
      about: topic.about,
    })),
    args.query.json
  );
  return 0;
}

function printTable(rows: readonly Record<string, unknown>[], json?: boolean) {
  if (json) {
    print(rows.map((row) => JSON.stringify(row)).join('\n'));
    return;
  }
  print(
    [
      Object.keys(rows[0]).join('\t'),
      ...rows.map((row) =>
        Object.values(row)
          .map((value) => value ?? '-')
          .join('\t')
      ),
    ].join('\n')
  );
}

const label = (app: App) => `${app.slug} on ${app.device}`;

const noReply = (app: App) =>
  `no reply from ${label(app)} in 5 s. Its JS may be paused at a breakpoint: resume it, then run the command again.`;

const stillWaiting = (what: string) =>
  `still ${what} after 5 s. The app keeps going, so run the same command again to pick up where it stopped.`;

const noAgent = (app: App) =>
  `${label(app)} has no devtools agent. It needs @axonpack/expo-devtools with <DevtoolsProvider> mounted, in a dev build.`;

function print(text: string) {
  process.stdout.write(`${text}\n`);
}

function fail(code: number, message: string): number {
  process.stderr.write(`error: ${message}\n`);
  return code;
}
