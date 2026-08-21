import { networkOverridesStore } from '../network-overrides.store';

describe('networkOverridesStore', () => {
  beforeEach(() => networkOverridesStore.clear());

  it('matches the whole URL and nothing near it', () => {
    networkOverridesStore.set({ url: 'https://example.test/a', action: 'block' });

    expect(networkOverridesStore.find('https://example.test/a')?.action).toBe('block');
    // Deliberately not a prefix or substring match: a rule that catches more than you meant is a
    // request you cannot explain.
    expect(networkOverridesStore.find('https://example.test/ab')).toBeUndefined();
    expect(networkOverridesStore.find('https://example.test/a?x=1')).toBeUndefined();
  });

  it('replaces a rule for the same URL rather than stacking a second one', () => {
    networkOverridesStore.set({ url: 'https://example.test/a', action: 'block' });
    networkOverridesStore.set({ url: 'https://example.test/a', action: 'respond', status: 500 });

    expect(networkOverridesStore.getSnapshot()).toHaveLength(1);
    expect(networkOverridesStore.find('https://example.test/a')).toMatchObject({
      action: 'respond',
      status: 500,
    });
  });

  it('tells its subscribers when a rule changes, and stops when they leave', () => {
    const listener = jest.fn();
    const unsubscribe = networkOverridesStore.subscribe(listener);

    networkOverridesStore.set({ url: 'https://example.test/a', action: 'block' });
    networkOverridesStore.remove('https://example.test/a');
    unsubscribe();
    networkOverridesStore.set({ url: 'https://example.test/b', action: 'block' });

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
