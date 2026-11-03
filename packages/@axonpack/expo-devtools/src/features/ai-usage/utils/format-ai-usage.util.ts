import type { AgentQuery } from '../../../agent/utils/run-query.util';
import { formatDuration } from '../../../core/utils/format-duration.util';
import type { JsonValue } from '../../../core/utils/json-tree.util';
import type { AiUsageEntry } from '../stores/ai-usage.store';

const TEXT_FLAGS = [
  'grep',
  'since',
  'until',
  'after',
  'before',
  'sort',
  'fields',
  'limit',
] as const;
const SWITCHES = ['count', 'full', 'json'] as const;

/** The query as the `devtools` command line that asks it, without the `npx devtools` in front. */
export function formatCommand(query: AgentQuery): string {
  const words = query.get === undefined ? [query.topic] : ['get', query.topic, query.get];
  for (const clause of query.where ?? []) words.push('--where', clause);
  for (const flag of TEXT_FLAGS) {
    if (query[flag] !== undefined) words.push(`--${flag}`, String(query[flag]));
  }
  if (query.groupBy !== undefined) words.push('--group-by', query.groupBy);
  for (const flag of SWITCHES) if (query[flag]) words.push(`--${flag}`);
  return words.map((word) => shellWord(String(word))).join(' ');
}

/** Quoted only when a shell would read it as something else, so the line can be pasted back. */
function shellWord(word: string): string {
  return /^[\w./:,@%+=-][\w./:,@%+=~-]*$/.test(word) ? word : `'${word.replace(/'/g, `'\\''`)}'`;
}

/**
 * A reply that is JSON (`get`) or JSON lines (`--json`), for the tree. Anything else, a cut reply
 * included, stays text.
 */
export function parseReply(reply: string): JsonValue | undefined {
  // `get` puts one `# <topic> <id>` line above its JSON.
  const body = reply.replace(/^# .*\n/, '');
  if (!body.startsWith('{')) return undefined;
  const whole = tryJson(body);
  if (whole !== undefined) return whole;
  const lines = body.split('\n').map(tryJson);
  return lines.includes(undefined) ? undefined : (lines as JsonValue[]);
}

function tryJson(text: string): JsonValue | undefined {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function formatClockTime(timestamp: number): string {
  return new Date(timestamp).toTimeString().slice(0, 8);
}

/** `matched/total`, or a dash for a reply with no rows behind it (an error, an off topic). */
export function formatMatched(entry: { matched?: number; total?: number }): string {
  return entry.matched === undefined ? '-' : `${entry.matched}/${entry.total}`;
}

/** What both detail views list above the reply. */
export function queryInfo(entry: AiUsageEntry): [label: string, value: string][] {
  const info: [string, string][] = [
    ['Time', formatClockTime(entry.timestamp)],
    ['Topic', entry.topic],
    ['Matched', formatMatched(entry)],
    ['Took', formatDuration(entry.duration)],
    ['Reply size', `${entry.size} chars${entry.cut ? ', cut to the first 64 K' : ''}`],
  ];
  if (entry.error !== undefined) info.push(['Error', entry.error]);
  return info;
}
