import {
  isStreamCaptureEnabled,
  recordStreamEvents,
  setStreamCapture,
} from '../record-stream-events.service';
import { networkLogStore } from '../../stores/network-log.store';

/**
 * The switch is over the traffic rather than over a transport: a stream arrives on a `fetch`, on an
 * `XMLHttpRequest` or from inside a page, and all three end here — so this is where turning streams
 * off has to be answered, whichever of them asked.
 */
describe('stream capture', () => {
  beforeAll(() => networkLogStore.setEnabled(true));
  beforeEach(() => {
    networkLogStore.clear();
    setStreamCapture(true);
    networkLogStore.add({
      id: 'r1',
      method: 'GET',
      url: 'https://example.test/stream',
      status: 'pending',
      eventStream: true,
      startedAt: 0,
    });
  });
  afterAll(() => setStreamCapture(true));

  it('keeps the events of a stream while streams are on', () => {
    recordStreamEvents('r1', [{ type: 'price', data: '42' }]);

    expect(isStreamCaptureEnabled()).toBe(true);
    expect(networkLogStore.getStreamEvents('r1')).toMatchObject([{ type: 'price', data: '42' }]);
  });

  it('keeps none for a stream whose row is not in the list', () => {
    recordStreamEvents('dropped', [{ type: 'price', data: '42' }]);

    expect(networkLogStore.getStreamEvents('dropped')).toEqual([]);
  });

  it('keeps none of them while they are off', () => {
    setStreamCapture(false);

    recordStreamEvents('r1', [{ type: 'price', data: '42' }]);

    expect(networkLogStore.getStreamEvents('r1')).toEqual([]);
  });
});
