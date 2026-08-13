import type { DevtoolsTab } from '../components/devtools-overlay/devtools-tab-bar.component';

let lastTab: DevtoolsTab = 'network';

export const devtoolsTabStore = {
  get(): DevtoolsTab {
    return lastTab;
  },
  set(next: DevtoolsTab) {
    lastTab = next;
  },
};
