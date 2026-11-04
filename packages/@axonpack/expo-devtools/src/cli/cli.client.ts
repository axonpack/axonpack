import { HELP } from './constants/help.const';
import { NO_REPLY, callAgent, type Way } from './services/evaluate.service';
import { DEFAULT_PORTS, findApps, pickApp, type App } from './services/find-apps.service';
import { parseArgv, type CliArgs } from './utils/parse-argv.util';
import type { AgentHello } from '../agent/services/install-agent.service';
import type { AgentActionCall } from '../agent/utils/run-action.util';
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
    print(helpFor(name, rest.length > 0));
    return 0;
  }
  const fixed = name === 'apps' || name === 'topics' || name === 'get';
  const usage =
    name === 'get'
      ? rest.length !== 2 && 'devtools get <topic> <id>'
      : fixed && rest.length > 0 && `devtools ${name}`;
  if (usage) return fail(1, `usage: ${usage}. See devtools ${name} --help`);
  // `devtools <topic> <action> <args...>`: a word after the topic names an action.
  const action = fixed ? undefined : rest[0];
  const flags = flagError(args, name, action);
  if (flags) return fail(1, flags);
  if (args.bodyFile !== undefined) {
    try {
      const { readFileSync } = require('node:fs') as {
        readFileSync: (path: string, encoding: 'utf8') => string;
      };
      args.options.body = readFileSync(args.bodyFile, 'utf8');
    } catch (error) {
      return fail(1, `can't read --body-file ${args.bodyFile}: ${(error as Error).message}`);
    }
  }

  const apps = await findApps(args.port ? [args.port] : DEFAULT_PORTS);
  if (apps.length === 0) {
    const ports = args.port ? `port ${args.port}` : 'ports 8081 to 8090';
    return fail(
      2,
      `no app found on Metro ${ports}. Open the app in a dev build or Expo Go with \`expo start\` running, or pass --port.`
    );
  }
  if (name === 'apps') return listApps(apps, args);

  const app = pickApp(apps, { app: args.app, device: args.device });
  if (typeof app === 'string') return fail(2, app);
  const way = wayIn(app, args.force);
  if (!way) {
    return fail(
      2,
      `${label(app)} can't share its debugger (React Native below 0.86, or Expo started headless), and metro.config.js has no withDevtools to ask through its DevTools window, so attaching could close one open on it. Pass --force to attach anyway.`
    );
  }

  if (name === 'topics') return listTopics(app, way, args);
  if (action !== undefined) {
    const call: AgentActionCall = {
      topic: name,
      action,
      args: rest.slice(1),
      options: args.options,
      ref: Math.random().toString(36).slice(2),
    };
    const reply = await ask(app, way, 'act', call);
    return typeof reply === 'number' ? reply : answer(app, reply);
  }
  const query: AgentQuery =
    name === 'get'
      ? { ...args.query, topic: rest[0], get: rest[1] }
      : { ...args.query, topic: name };
  // A file gets the reply whole.
  if (args.out) query.full = true;
  const reply = await ask(app, way, 'run', query);
  return typeof reply === 'number' ? reply : answer(app, reply, query, args.out);
}

/** `devtools network --help` adds the network actions, and `devtools network <action> --help` is only them. */
function helpFor(name: string | undefined, action: boolean): string {
  if (name === undefined || name === 'help') return HELP.main;
  if (name === 'apps' || name === 'topics' || name === 'get') return HELP[name];
  if (name !== 'network') return HELP.query;
  return action ? HELP.network : `${HELP.query}\n\n${HELP.network}`;
}

/** Query flags and action flags each go with their own kind of command, never quietly ignored. */
function flagError(args: CliArgs, name: string, action: string | undefined): string | undefined {
  const actionFlags = Object.keys(args.options).length > 0 || args.bodyFile !== undefined;
  if (action === undefined) {
    return actionFlags
      ? `--status, --body, --body-file, --content-type, --header, --yes and --all go with an action, such as devtools network override <url>. See devtools network --help`
      : undefined;
  }
  if (Object.keys(args.query).length > 0 || args.out !== undefined) {
    return `query flags such as --where, --json and --out don't go with an action, and ${name} ${action} is one. See devtools ${name} --help`;
  }
  if (args.options.body !== undefined && args.bodyFile !== undefined) {
    return 'pass --body or --body-file, not both';
  }
  return undefined;
}

/**
 * How to reach the app without closing a DevTools window open on it, or undefined when only
 * `--force` can say.
 */
function wayIn(app: App, force: boolean): Way | undefined {
  if (app.multipleDebuggers) return 'socket';
  if (app.windowOpen) return 'window';
  // With the route there and no window open, there is nothing to close. Without it, no telling.
  return app.windowOpen === false || force ? 'socket' : undefined;
}

/**
 * Asks again on `# wait:`, which a topic still reading (storage keys, values) or an action still
 * sending answers with. Resolves to the reply, or to the exit code once it has printed why there is
 * none.
 */
async function ask(
  app: App,
  way: Way,
  method: 'run' | 'act',
  arg: AgentQuery | AgentActionCall
): Promise<string | number> {
  const deadline = Date.now() + TIMEOUT_MS;
  const late = method === 'act' ? stillActing : stillWaiting;
  let waitingFor: string | undefined;
  for (;;) {
    const reply = await callAgent(app, way, method, arg, deadline - Date.now());
    if (reply === NO_REPLY) return fail(1, waitingFor ? late(waitingFor) : noReply(app));
    if (reply == null) return fail(2, noAgent(app));
    const text = String(reply);
    if (!text.startsWith(WAIT)) return text;
    waitingFor = text.slice(WAIT.length);
    if (deadline - Date.now() <= WAIT_MS) return fail(1, late(waitingFor));
    await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
  }
}

function answer(app: App, reply: string, query?: AgentQuery, out?: string): number {
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
  // A `get` file holds the entry alone, so it parses as JSON. Its `# <topic> <id>` line stays here.
  const head = query?.get !== undefined && text.startsWith('# ') ? text.split('\n', 1)[0] : '';
  const body = head ? text.slice(head.length + 1) : text;
  writeFileSync(out, `${body}\n`);
  print(`${head || `# ${query?.topic}`}: wrote ${body.length} chars to ${out}`);
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
      const way = wayIn(app, args.force);
      if (!way) {
        return {
          ...row,
          note: "can't share its debugger, and metro.config.js has no withDevtools",
        };
      }
      try {
        const hello = await callAgent(app, way, 'hello', undefined, TIMEOUT_MS);
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
  if (!args.query.json && apps.some((app) => !wayIn(app, args.force))) {
    print('# ?: checking would close a DevTools window open on the app. --force checks anyway.');
  }
  return 0;
}

async function listTopics(app: App, way: Way, args: CliArgs): Promise<number> {
  const hello = (await callAgent(app, way, 'hello', undefined, TIMEOUT_MS)) as
    AgentHello | null | typeof NO_REPLY;
  if (hello === NO_REPLY) return fail(1, noReply(app));
  if (hello == null) return fail(2, noAgent(app));
  if (!args.query.json) print(`# topics · ${app.slug} · ${app.device}`);
  printTable(
    hello.topics.map((topic) => ({
      topic: topic.name,
      rows: topic.rows ?? 'off',
      // An app on an older version sends no actions.
      actions: topic.actions?.length ? topic.actions : null,
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

// Asking again would send it again, so this one points at where its outcome lands instead.
const stillActing = (what: string) =>
  `still ${what} after 5 s. It carries on in the app, and the CLI tab or devtools cli --where 'action?' shows how it ended.`;

const noAgent = (app: App) =>
  `${label(app)} has no devtools agent. It needs @axonpack/expo-devtools with <DevtoolsProvider> mounted, in a dev build or Expo Go.`;

/** Nothing for no text, so `--json` with no rows prints nothing rather than an empty line. */
function print(text: string) {
  if (text) process.stdout.write(`${text}\n`);
}

function fail(code: number, message: string): number {
  process.stderr.write(`error: ${message}\n`);
  return code;
}
