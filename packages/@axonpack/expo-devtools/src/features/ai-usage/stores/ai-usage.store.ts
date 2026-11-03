import { EventEmitter } from 'expo';

import type { AgentQuery, AgentReply } from '../../../agent/utils/run-query.util';
import { createStoreHook } from '../../../core/stores/axon.store';
import { coalesceNotify } from '../../../core/utils/coalesce-notify.util';
import { formatCommand } from '../utils/format-ai-usage.util';

/** One query an agent made through `devtools`, and the reply it got. Newest first, 100 at most. */
export type AiUsageEntry = {
  id: string;
  /** When the app answered, as `Date.now()` milliseconds. */
  timestamp: number;
  /** The query as the command line that asks it, flags included. */
  command: string;
  topic: string;
  /** Rows the query matched, of `total` the topic held. Unset for an error or a topic that is off. */
  matched?: number;
  total?: number;
  /** How long the app took to answer, in ms to one decimal. */
  duration: number;
  /** The whole reply's length in characters, even when `reply` was cut or left out. */
  size: number;
  /** The message of an `error:` reply. */
  error?: string;
  /**
   * The reply exactly as the agent got it, so after every redaction. Unset for a query of
   * `ai-usage` itself, which would otherwise nest every earlier reply inside it.
   */
  reply?: string;
  /** The reply was longer than `MAX_REPLY` and only its start is kept. */
  cut?: boolean;
};

type AiUsageEvents = {
  change: () => void;
};

const MAX_ENTRIES = 100;
/** With `MAX_ENTRIES`, what gives the buffer a known ceiling. `--full` and `--out` can ask for MBs. */
const MAX_REPLY = 64 * 1024;
const ERROR_PREFIX = 'error: ';

let entries: AiUsageEntry[] = [];
let paused = false;
let sequence = 0;

const emitter = new EventEmitter<AiUsageEvents>();
const notify = coalesceNotify(emitter);

export const aiUsageStore = {
  getSnapshot(): AiUsageEntry[] {
    return entries;
  },
  isPaused(): boolean {
    return paused;
  },
  subscribe(listener: () => void) {
    const subscription = emitter.addListener('change', listener);
    return () => subscription.remove();
  },
  setPaused(nextPaused: boolean) {
    paused = nextPaused;
    notify();
  },
  record(query: AgentQuery, reply: AgentReply, duration: number) {
    if (paused) return;
    sequence += 1;
    const { text } = reply;
    const keep = query.topic !== 'ai-usage';
    const entry: AiUsageEntry = {
      id: `q${sequence}`,
      timestamp: Date.now(),
      command: formatCommand(query),
      topic: String(query.topic),
      matched: reply.matched,
      total: reply.total,
      duration: Math.round(duration * 10) / 10,
      size: text.length,
      error: text.startsWith(ERROR_PREFIX) ? text.slice(ERROR_PREFIX.length) : undefined,
      reply: keep ? text.slice(0, MAX_REPLY) : undefined,
      cut: keep && text.length > MAX_REPLY ? true : undefined,
    };
    entries = [entry, ...entries].slice(0, MAX_ENTRIES);
    notify();
  },
  clear() {
    entries = [];
    notify();
  },
};

export const useAiUsageStore = createStoreHook(aiUsageStore.subscribe);
