import type { AxonpackPanel } from '../../constants/panels.const';
import { withLateComers } from '../use-tab-order.service';

const panel = (id: string) => ({ id, title: id, component: () => null }) as AxonpackPanel;

describe('withLateComers', () => {
  it('keeps the saved order and puts a panel it has not seen last', () => {
    expect(withLateComers(['b', 'a'], [panel('a'), panel('nav'), panel('b')])).toEqual([
      'b',
      'a',
      'nav',
    ]);
  });
});
