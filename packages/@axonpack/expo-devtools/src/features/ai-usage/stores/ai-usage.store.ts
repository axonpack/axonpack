import { EventEmitter } from 'expo';

import type { AgentActionCall } from '../../../agent/utils/run-action.util';
import type { AgentQuery, AgentReply } from '../../../agent/utils/run-query.util';
import { createStoreHook } from '../../../core/stores/axon.store';
import { coalesceNotify } from '../../../core/utils/coalesce-notify.util';
import { formatAction, formatCommand } from '../utils/format-ai-usage.util';

/**
 * One query or action an agent made through `devtools`, and the reply it got. Newest first, 100 at
 * most.
 */
export type AiUsageEntry = {
  id: string;
  /** When the app answered, as `Date.now()` milliseconds. */
  timestamp: number;
  /** The query or action as the command line that asks it, flags included. */
  command: string;
  topic: string;
  /** The action's name, unset for a query. What marks a row as a change rather than a read. */
  action?: string;
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
    add(
      { command: formatCommand(query), topic: String(query.topic), ...reply },
      duration,
      query.topic !== 'ai-usage'
    );
  },
  recordAction(call: AgentActionCall, text: string, duration: number) {
    add(
      { command: formatAction(call), topic: String(call.topic), action: String(call.action), text },
      duration,
      true
    );
  },
  clear() {
    entries = [];
    notify();
  },
};

function add(
  reply: Pick<AiUsageEntry, 'command' | 'topic' | 'action' | 'matched' | 'total'> & {
    text: string;
  },
  duration: number,
  keep: boolean
) {
  if (paused) return;
  sequence += 1;
  const { text, ...rest } = reply;
  entries = [
    {
      ...rest,
      id: `q${sequence}`,
      timestamp: Date.now(),
      duration: Math.round(duration * 10) / 10,
      size: text.length,
      error: text.startsWith(ERROR_PREFIX) ? text.slice(ERROR_PREFIX.length) : undefined,
      reply: keep ? text.slice(0, MAX_REPLY) : undefined,
      cut: keep && text.length > MAX_REPLY ? true : undefined,
    },
    ...entries,
  ].slice(0, MAX_ENTRIES);
  notify();
}

export const useAiUsageStore = createStoreHook(aiUsageStore.subscribe);
