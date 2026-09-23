import '../register-tab.service';

// Stood in for, because what is under test is the registration, not the tab. Rendered for real it
// pulls every feature's module graph in.
jest.mock('../../components/axonpack-tab.component', () => ({ AxonpackTab: () => null }));

/** Where the tab package keeps its tab list, for the DevTools frontend to read on connect. */
const TABS = '__axonpack-rn-devtools_tabs__';

function registered() {
  return ((globalThis as Record<string, unknown>)[TABS] ?? []) as { name: string }[];
}

describe('register-tab.service', () => {
  it('registers the Axonpack tab at import', () => {
    expect(registered().map((tab) => tab.name)).toEqual(['Axonpack']);
  });
});
