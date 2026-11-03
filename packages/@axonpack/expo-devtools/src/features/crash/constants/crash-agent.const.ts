import type { AgentTopic } from '../../../agent/constants/agent-topics.const';
import { crashStore, type CrashRecord } from '../stores/crash.store';

export const CRASH_AGENT: AgentTopic<CrashRecord> = {
  name: 'crash',
  about: 'captured crashes, newest first; get shows the stack, breadcrumbs and device',
  rows: crashStore.getSnapshot,
  enabled: crashStore.isEnabled,
  off: 'crash.enabled is false',
  fields: {
    id: (r) => r.id,
    t: (r) => r.timestamp,
    kind: (r) => r.kind,
    name: (r) => r.name,
    message: (r) => r.message,
    route: (r) => r.route?.name,
    previous: (r) => r.fromPreviousLaunch,
    seen: (r) => r.seen,
  },
  show: ['id', 'kind', 'name', 'message'],
};
