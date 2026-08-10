import type { DevtoolsTab } from '../components/devtools-overlay/devtools-tab-bar.component';

/**
 * The tab the panel was on when it last closed.
 *
 * `DevtoolsPanel` unmounts with the modal — deliberately, so its store subscriptions stop while it's
 * hidden — which means component state can't survive a close. Module scope can, and it's plain state
 * with a single reader, so there's no subscribe/notify here: the panel reads it once on mount.
 *
 * In memory only. It resets when the app restarts, which needs no storage dependency and matches what
 * "where I was a moment ago" means in practice.
 */
let lastTab: DevtoolsTab = 'network';

export const devtoolsTabStore = {
  get(): DevtoolsTab {
    return lastTab;
  },
  set(next: DevtoolsTab) {
    lastTab = next;
  },
};
