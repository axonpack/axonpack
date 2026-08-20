import {
  captureInitiatorFrames,
  dropOwnFrames,
  primaryInitiatorFrame,
} from '../capture-initiator.service';
import type { StackFrame } from '../../../../core/utils/parse-stack.util';

const frame = (fn: string, location: string, vendor = false): StackFrame => ({
  fn,
  location,
  vendor,
});

describe('dropOwnFrames', () => {
  it('drops this package instrumentation from the top of the stack', () => {
    const frames = [
      frame('captureInitiatorFrames', '/pkg/services/capture-initiator.service.js:5:1'),
      frame('fetch', '/pkg/services/patch-fetch.service.js:82:9'),
      frame('loadUser', '/src/screens/user.ts:12:4'),
    ];

    expect(dropOwnFrames(frames).map((f) => f.fn)).toEqual(['loadUser']);
  });

  it('stops at the first frame that is not ours, and keeps the rest', () => {
    const frames = [
      frame('fetch', '/pkg/services/patch-fetch.service.js:82:9'),
      frame('loadUser', '/src/screens/user.ts:12:4'),
      // Ours again, deeper down — a devtools frame below the caller stays, since trimming past the
      // caller would throw away the trace this tab exists to show.
      frame('replay', '/pkg/services/patch-xhr.service.js:9:1'),
    ];

    expect(dropOwnFrames(frames).map((f) => f.fn)).toEqual(['loadUser', 'replay']);
  });

  it('returns nothing for a stack that is entirely ours', () => {
    expect(dropOwnFrames([frame('x', '/pkg/services/patch-fetch.service.js:1:1')])).toEqual([]);
  });
});

describe('captureInitiatorFrames', () => {
  it('captures a non-empty stack', () => {
    expect(captureInitiatorFrames().length).toBeGreaterThan(0);
  });
});

describe('primaryInitiatorFrame', () => {
  it('prefers the first frame that is not library code', () => {
    const frames = [
      frame('fetchWrapper', '/node_modules/axios/index.js:1:1', true),
      frame('loadUser', '/src/screens/user.ts:12:4'),
    ];

    expect(primaryInitiatorFrame(frames)?.fn).toBe('loadUser');
  });

  it('falls back to the first frame when every frame is library code', () => {
    const frames = [
      frame('a', '/node_modules/a.js:1:1', true),
      frame('b', '/node_modules/b.js', true),
    ];

    expect(primaryInitiatorFrame(frames)?.fn).toBe('a');
  });

  it('is null for an empty stack', () => {
    expect(primaryInitiatorFrame([])).toBeNull();
  });
});
