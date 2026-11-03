import type { AgentTopic } from '../../../agent/constants/agent-topics.const';
import { reduxStore, type ReduxAction } from '../stores/redux.store';
import { diffState, formatStatePath, type StateChange } from '../utils/diff-state.util';

/** The diff instead of both whole states: smaller, and `--grep` then matches what changed. */
type ReduxAgentRow = {
  id: string;
  timestamp: number;
  type: string;
  action: ReduxAction;
  changes: (Omit<StateChange, 'path'> & { path: string })[];
};

// ponytail: diffs every kept action on every query. Cheap because unchanged branches are skipped
// by reference and there are at most 200 rows; cache by id if it ever shows in a profile.
function rows(): ReduxAgentRow[] {
  return reduxStore.getSnapshot().map(({ id, timestamp, type, action, prevState, state }) => ({
    id,
    timestamp,
    type,
    action,
    changes: diffState(prevState, state).map((change) => ({
      ...change,
      path: formatStatePath(change.path),
    })),
  }));
}

export const REDUX_AGENT: AgentTopic<ReduxAgentRow> = {
  name: 'redux',
  about: 'dispatched actions (last 200), newest first, each with what it changed in the state',
  rows,
  enabled: () => reduxStore.isEnabled() && reduxStore.isAttached(),
  off: 'no Redux store uses devtoolsReduxEnhancer()',
  fields: {
    id: (r) => r.id,
    t: (r) => r.timestamp,
    type: (r) => r.type,
    action: (r) => r.action,
    changed: (r) => r.changes.map((change) => change.path).join(', '),
    changes: (r) => r.changes.length,
  },
  show: ['id', 'type', 'changed'],
};
