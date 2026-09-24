import { networkLogStore } from '../../stores/network-log.store';
import { configureNetworkRedaction } from '../redact-network.service';

const request = {
  id: 'r1',
  method: 'GET',
  url: 'https://example.test/me?token=abc',
  status: 'pending' as const,
  startedAt: 0,
  requestHeaders: { Authorization: 'Bearer secret', accept: 'application/json' },
};

describe('network redaction', () => {
  beforeEach(() => {
    networkLogStore.setEnabled(true);
    networkLogStore.clear();
    configureNetworkRedaction({});
  });

  it('redacts nothing by default', () => {
    networkLogStore.add({ ...request, pageCookies: 'sid=1' });

    const [entry] = networkLogStore.getSnapshot();
    expect(entry.requestHeaders).toBe(request.requestHeaders);
    expect(entry.pageCookies).toBe('sid=1');
  });

  it('redacts listed headers case-insensitively, on add and on update', () => {
    configureNetworkRedaction({ headers: ['authorization', 'Set-Cookie'] });
    networkLogStore.add(request);
    networkLogStore.update('r1', {
      status: 'success',
      responseHeaders: { 'set-cookie': 'sid=1', 'content-type': 'application/json' },
    });

    const [entry] = networkLogStore.getSnapshot();
    expect(entry.requestHeaders).toEqual({
      Authorization: '[redacted]',
      accept: 'application/json',
    });
    expect(entry.responseHeaders).toEqual({
      'set-cookie': '[redacted]',
      'content-type': 'application/json',
    });
  });

  it('runs the hook after header redaction, and drops the entry on null or a throw', () => {
    configureNetworkRedaction({
      headers: ['authorization'],
      redact: (entry) =>
        entry.url.includes('/drop')
          ? null
          : entry.url.includes('/boom')
            ? (() => {
                throw new Error('bug');
              })()
            : { ...entry, url: entry.url.replace(/token=[^&]+/, 'token=x') },
    });
    networkLogStore.add(request);
    networkLogStore.add({ ...request, id: 'r2', url: 'https://example.test/drop' });
    networkLogStore.add({ ...request, id: 'r3', url: 'https://example.test/boom' });

    const entries = networkLogStore.getSnapshot();
    expect(entries.map((e) => e.id)).toEqual(['r1']);
    expect(entries[0].url).toBe('https://example.test/me?token=x');
    expect(entries[0].requestHeaders?.Authorization).toBe('[redacted]');
  });

  it('redacts a page cookie string while cookie is on the list', () => {
    configureNetworkRedaction({ headers: ['cookie'] });
    networkLogStore.add({ ...request, pageCookies: 'sid=1' });
    expect(networkLogStore.getSnapshot()[0].pageCookies).toBe('[redacted]');
  });
});
