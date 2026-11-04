import type { AgentTopic } from '../../../agent/constants/agent-topics.const';
import { aiUsageStore, type AiUsageEntry } from '../stores/ai-usage.store';

export const AI_USAGE_AGENT: AgentTopic<AiUsageEntry> = {
  name: 'cli',
  alias: 'ai-usage',
  title: 'CLI',
  about:
    'queries and actions made with this tool in this app (last 100), newest first, each with the reply it got (get <id> for one reply). action? lists the actions. A query of CLI keeps no reply',
  rows: aiUsageStore.getSnapshot,
  fields: {
    id: (e) => e.id,
    t: (e) => e.timestamp,
    command: (e) => e.command,
    topic: (e) => e.topic,
    action: (e) => e.action,
    matched: (e) => e.matched,
    total: (e) => e.total,
    ms: (e) => e.duration,
    size: (e) => e.size,
    error: (e) => e.error,
    cut: (e) => e.cut,
    reply: (e) => e.reply,
  },
  show: ['id', 'command', 'matched', 'total', 'ms'],
};
