import { captureCallSite, dropOwnFrames, primaryCallSite } from '../capture-call-site.service';
import type { StackFrame } from '../../../../core/utils/parse-stack.util';

const frame = (fn: string, location: string, vendor = false): StackFrame => ({
  fn,
  location,
  vendor,
});

describe('dropOwnFrames', () => {
  it('drops the console patch from the top, leaving whoever logged', () => {
    const frames = [
      frame('captureCallSite', '/pkg/services/capture-call-site.service.js:20:1'),
      frame('console.error', '/pkg/services/patch-console.service.js:44:9'),
      frame('checkout', '/src/screens/checkout.ts:31:7'),
    ];

    expect(dropOwnFrames(frames).map((f) => f.fn)).toEqual(['checkout']);
  });

  // Trimming past the caller would throw away the trace the feature exists to show.
  it('keeps one of ours that appears below the caller', () => {
    const frames = [
      frame('console.error', '/pkg/services/patch-console.service.js:44:9'),
      frame('checkout', '/src/screens/checkout.ts:31:7'),
      frame('replay', '/pkg/services/patch-console.service.js:9:1'),
    ];

    expect(dropOwnFrames(frames).map((f) => f.fn)).toEqual(['checkout', 'replay']);
  });

  it('returns nothing for a stack that is entirely ours', () => {
    expect(dropOwnFrames([frame('x', '/pkg/services/patch-console.service.js:1:1')])).toEqual([]);
  });
});

describe('primaryCallSite', () => {
  it('prefers the app own code over a library frame', () => {
    const frames = [
      frame('warnOnce', '/node_modules/react-native/Libraries/warn.js:2:1', true),
      frame('CheckoutScreen', '/src/screens/checkout.tsx:12:4'),
    ];

    expect(primaryCallSite(frames)?.fn).toBe('CheckoutScreen');
  });

  it('falls back to the first frame when all of them are library code', () => {
    const frames = [frame('a', '/node_modules/a.js:1:1', true)];
    expect(primaryCallSite(frames)?.fn).toBe('a');
  });

  it('is undefined for an empty stack', () => {
    expect(primaryCallSite([])).toBeUndefined();
  });
});

describe('captureCallSite', () => {
  it('captures a non-empty stack', () => {
    expect(captureCallSite().length).toBeGreaterThan(0);
  });
});
