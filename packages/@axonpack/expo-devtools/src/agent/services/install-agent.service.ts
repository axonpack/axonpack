import { Platform } from 'react-native';

import { aiUsageStore } from '../../features/ai-usage/stores/ai-usage.store';
import { maskHeaderLine } from '../../features/network/services/redact-network.service';
import { TOPICS } from '../constants/agent-topics.const';
import { runAction, type AgentActionCall } from '../utils/run-action.util';
import { runQuery, type AgentQuery } from '../utils/run-query.util';

type ExpoConstants = { expoConfig?: { slug?: string; name?: string } | null };

/**
 * At module scope for the reason `detect-router.service.ts` gives: only a `require` inside a `try`
 * while this module initialises is caught if it fails. `expo-constants` comes with `expo`, but not
 * every install layout lets this package resolve it.
 */
let expoConstants: ExpoConstants | null = null;
try {
  expoConstants = require('expo-constants').default;
} catch {
  // The CLI can still read the slug from Metro's manifest.
}

const VERSION: string = require('../../../package.json').version;

/** What `devtools apps` and `devtools topics` show for this app. */
function hello() {
  const config = expoConstants?.expoConfig;
  return {
    version: VERSION,
    slug: config?.slug,
    name: config?.name,
    platform: Platform.OS,
    topics: TOPICS.map((topic) => ({
      name: topic.name,
      about: topic.about,
      // null for a feature the app turned off, so `topics` can say so.
      rows: topic.enabled?.() === false ? null : topic.rows().length,
      actions: topic.actions ? Object.keys(topic.actions) : [],
    })),
  };
}

export type AgentHello = ReturnType<typeof hello>;

/**
 * Every query passes through here and `hello` does not, so the AI Usage tab records each query and
 * never a probe.
 */
function run(query: AgentQuery): string {
  const start = performance.now();
  const reply = runQuery(TOPICS, query);
  // The CLI asks again every 200 ms while it waits, and the answer it ends on is the one it shows.
  if (!reply.text.startsWith('# wait: ')) {
    aiUsageStore.record(query, reply, performance.now() - start);
  }
  return reply.text;
}

const WAITING = 20;
/**
 * Actions that wait on the app (a request), by call, until the CLI asks for the answer. A call the
 * CLI gave up on stays until `WAITING` newer ones push it out.
 */
const waiting = new Map<string, { waitingFor: string; text?: string }>();

/**
 * Runs one action. The evaluate that asks can't await, so an action that waits answers
 * `# wait:` and the CLI asks again with the same call, every 200 ms, until the answer is in.
 */
function act(call: AgentActionCall): string {
  const key = JSON.stringify(call);
  const known = waiting.get(key);
  if (known) {
    if (known.text === undefined) return `# wait: ${known.waitingFor}`;
    waiting.delete(key);
    return known.text;
  }
  const start = performance.now();
  // Recorded when it ends, whether or not the CLI is still asking. A header the agent sent is
  // masked as a logged one is, since the AI Usage tab shows the command.
  const done = (text: string) => {
    const header = call?.options?.header;
    const shown = Array.isArray(header)
      ? { ...call, options: { ...call.options, header: header.map(maskHeaderLine) } }
      : call;
    aiUsageStore.recordAction(shown, text, performance.now() - start);
    return text;
  };
  const answer = runAction(TOPICS, call);
  if (typeof answer === 'string') return done(answer);
  const slot: { waitingFor: string; text?: string } = { waitingFor: answer.waitingFor };
  waiting.set(key, slot);
  if (waiting.size > WAITING) waiting.delete(waiting.keys().next().value!);
  answer.answer.then((text) => {
    slot.text = done(text);
  });
  return `# wait: ${slot.waitingFor}`;
}

/**
 * The CLI evaluates `__AXONPACK_AGENT__.run(...)` or `.act(...)` over the debugger socket. Dev builds only: a
 * release build has no debugger to answer anyway.
 */
export function installAgent() {
  if (!__DEV__) return;
  (globalThis as any).__AXONPACK_AGENT__ = { hello, run, act };
}
