import { Platform } from 'react-native';

import { aiUsageStore } from '../../features/ai-usage/stores/ai-usage.store';
import { TOPICS } from '../constants/agent-topics.const';
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

/**
 * The CLI evaluates `__AXONPACK_AGENT__.run(...)` over the debugger socket. Dev builds only: a
 * release build has no debugger to answer anyway.
 */
export function installAgent() {
  if (!__DEV__) return;
  (globalThis as any).__AXONPACK_AGENT__ = { hello, run };
}
