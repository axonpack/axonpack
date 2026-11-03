import type { AgentTopic } from '../../../agent/constants/agent-topics.const';
import { consoleLogStore, type ConsoleLogEntry } from '../stores/console-log.store';

export const CONSOLE_AGENT: AgentTopic<ConsoleLogEntry> = {
  name: 'console',
  about: 'console lines since launch (last 500), newest first; repeats fold into one row',
  rows: consoleLogStore.getSnapshot,
  enabled: consoleLogStore.isEnabled,
  off: 'console.capture and console.repl are both off',
  fields: {
    id: (e) => e.id,
    t: (e) => e.timestamp,
    level: (e) => e.level,
    text: (e) => e.text,
    count: (e) => e.count,
    source: (e) => e.source,
    crash: (e) => e.crashId,
  },
  show: ['id', 'level', 'text'],
};
