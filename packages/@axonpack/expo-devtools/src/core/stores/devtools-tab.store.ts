/** A built-in tab's key, or a support's id. */
let lastTab = 'network';

export const devtoolsTabStore = {
  get(): string {
    return lastTab;
  },
  set(next: string) {
    lastTab = next;
  },
};
