import type { AgentQuery } from '../../agent/utils/run-query.util';

export type CliArgs = {
  /** The words that are not flags: the command, then its topic and id. */
  words: string[];
  /** Every query flag, as `__AXONPACK_AGENT__.run` takes it. */
  query: Omit<AgentQuery, 'topic' | 'get'>;
  app?: string;
  device?: string;
  port?: number;
  out?: string;
  force: boolean;
  help: boolean;
};

const QUERY_TEXT = ['grep', 'since', 'until', 'after', 'before', 'sort', 'fields'] as const;
const QUERY_SWITCHES = ['count', 'full', 'json'] as const;

/** Throws a one-line message on a flag it does not know or one missing its value. */
export function parseArgv(argv: readonly string[]): CliArgs {
  const parsed: CliArgs = { words: [], query: {}, force: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      parsed.help = true;
      continue;
    }
    if (!arg.startsWith('-')) {
      parsed.words.push(arg);
      continue;
    }
    const equals = arg.indexOf('=');
    const name = arg.slice(2, equals === -1 ? undefined : equals);
    const value = () => {
      if (equals !== -1) return arg.slice(equals + 1);
      // Taken whatever it looks like, since a value can start with a dash: `--sort -ms`.
      if (i + 1 >= argv.length) throw new Error(`--${name} needs a value`);
      return argv[++i];
    };

    if (!arg.startsWith('--')) throw new Error(`unknown flag ${arg}. See devtools --help`);
    if ((QUERY_TEXT as readonly string[]).includes(name)) {
      parsed.query[name as (typeof QUERY_TEXT)[number]] = value();
    } else if ((QUERY_SWITCHES as readonly string[]).includes(name)) {
      parsed.query[name as (typeof QUERY_SWITCHES)[number]] = true;
    } else if (name === 'where') {
      (parsed.query.where ??= []).push(value());
    } else if (name === 'group-by') {
      parsed.query.groupBy = value();
    } else if (name === 'limit') {
      parsed.query.limit = wholeNumber('--limit', value());
    } else if (name === 'port') {
      parsed.port = wholeNumber('--port', value());
    } else if (name === 'app' || name === 'device' || name === 'out') {
      parsed[name] = value();
    } else if (name === 'force') {
      parsed.force = true;
    } else {
      throw new Error(`unknown flag --${name}. See devtools --help`);
    }
  }
  return parsed;
}

// A bad number would reach the app as `null` and quietly mean the default.
function wholeNumber(flag: string, text: string): number {
  const number = Number(text);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`bad ${flag} ${text}: use a whole number from 1`);
  }
  return number;
}
