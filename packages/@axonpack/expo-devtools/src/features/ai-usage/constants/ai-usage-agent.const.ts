import type { AgentTopic } from '../../../agent/constants/agent-topics.const';
import { aiUsageStore, type AiUsageEntry } from '../stores/ai-usage.store';

export const AI_USAGE_AGENT: AgentTopic<AiUsageEntry> = {
  name: 'ai-usage',
  about:
    'queries agents made of this app (last 100), newest first, each with the reply it got (get <id> for one reply). A query of ai-usage keeps no reply',
  rows: aiUsageStore.getSnapshot,
  fields: {
    id: (e) => e.id,
    t: (e) => e.timestamp,
    command: (e) => e.command,
    topic: (e) => e.topic,
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
