import { isActionTypeRecorded } from '../action-type-lists.util';

describe('isActionTypeRecorded', () => {
  it('records everything with empty lists', () => {
    expect(isActionTypeRecorded('a/b', [], [])).toBe(true);
  });

  it('matches strings exactly and patterns by test', () => {
    expect(isActionTypeRecorded('cart/add', ['cart'], [])).toBe(false);
    expect(isActionTypeRecorded('cart/add', [/^cart\//], [])).toBe(true);
  });

  it('lets the deny list win', () => {
    expect(isActionTypeRecorded('timer/tick', [/^timer\//], ['timer/tick'])).toBe(false);
    expect(isActionTypeRecorded('timer/start', [/^timer\//], ['timer/tick'])).toBe(true);
  });
});
