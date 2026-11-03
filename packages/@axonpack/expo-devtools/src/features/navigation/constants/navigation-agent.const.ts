import type { AgentTopic } from '../../../agent/constants/agent-topics.const';
import { navigationStore, type NavigationMove } from '../stores/navigation.store';

export const NAVIGATION_AGENT: AgentTopic<NavigationMove> = {
  name: 'navigation',
  about: 'navigator moves (last 200), newest first; get shows params and the state after',
  rows: navigationStore.getSnapshot,
  enabled: () => navigationStore.isEnabled() && navigationStore.getRouterKind() !== null,
  off: 'no Expo Router or React Navigation found',
  fields: {
    id: (m) => m.id,
    t: (m) => m.timestamp,
    action: (m) => m.action,
    from: (m) => m.from?.name,
    to: (m) => m.to?.name,
    path: (m) => m.to?.path,
    params: (m) => m.to?.params,
    container: (m) => m.container,
    noop: (m) => m.noop,
  },
  show: ['id', 'action', 'from', 'to'],
};
