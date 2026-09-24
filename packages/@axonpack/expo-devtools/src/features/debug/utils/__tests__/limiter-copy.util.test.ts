import { blockNote, formatPreset } from '../limiter-copy.util';

describe('limiter copy', () => {
  it('writes a whole second as seconds', () => {
    expect([formatPreset(250), formatPreset(1000), formatPreset(3000)]).toEqual([
      '250ms',
      '1s',
      '3s',
    ]);
  });

  it('says why the main thread cannot be blocked without the native module', () => {
    expect(blockNote('main', false)).toMatch(/needs a dev build/);
    expect(blockNote('js', false)).toMatch(/long task/);
  });
});
