import type { NetworkLogEntry } from '../../stores/network-log.store';
import { networkOverridesStore } from '../../stores/network-overrides.store';
import { overrideDraftFor, saveOverride } from '../override-draft.util';

const entry: NetworkLogEntry = {
  kind: 'http',
  id: 'a',
  method: 'GET',
  url: 'https://example.dev/api/users',
  status: 'success',
  statusCode: 404,
  mimeType: 'application/json',
  responseBody: '{"a":1}',
  startedAt: 0,
};

afterEach(() => networkOverridesStore.clear());

describe('overrideDraftFor', () => {
  it('starts from what the server answered when the URL has no rule', () => {
    expect(overrideDraftFor(entry)).toEqual({
      status: '404',
      contentType: 'application/json',
      body: '{\n  "a": 1\n}',
    });
  });

  it('starts from the saved rule when there is one', () => {
    saveOverride(entry.url, { status: '201', contentType: 'text/plain', body: 'ok' });
    expect(overrideDraftFor(entry)).toEqual({
      status: '201',
      contentType: 'text/plain',
      body: 'ok',
    });
  });
});

describe('saveOverride', () => {
  it('reads a status that is not one as 200, and an empty content type as JSON', () => {
    saveOverride(entry.url, { status: 'abc', contentType: ' ', body: '' });
    expect(networkOverridesStore.find(entry.url)).toMatchObject({
      action: 'respond',
      status: 200,
      contentType: 'application/json',
    });
  });
});
