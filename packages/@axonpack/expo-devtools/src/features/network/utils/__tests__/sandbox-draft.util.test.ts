import { buildSandboxRequest, sandboxDraftFor } from '../sandbox.util';

describe('sandboxDraftFor and buildSandboxRequest', () => {
  const captured = {
    method: 'POST',
    url: 'https://example.dev/api/users?page=2',
    requestHeaders: {
      Authorization: 'Bearer abc',
      Cookie: 'session=1; theme=dark',
      'Content-Type': 'application/json',
    },
    requestBody: '{"a":1}',
  };

  it('takes a request apart into the sections the sandbox edits', () => {
    const draft = sandboxDraftFor(captured);
    expect(draft.url).toBe('https://example.dev/api/users');
    expect(draft.auth).toMatchObject({ type: 'bearer', bearerToken: 'abc' });
    expect(draft.paramRows.map((row) => [row.key, row.value])).toEqual([
      ['page', '2'],
      ['', ''],
    ]);
    expect(draft.cookieRows.filter((row) => row.key).map((row) => row.key)).toEqual([
      'session',
      'theme',
    ]);
  });

  it('puts an unedited request back together as it was sent', () => {
    expect(buildSandboxRequest(sandboxDraftFor(captured))).toEqual({
      method: 'POST',
      url: captured.url,
      headers: captured.requestHeaders,
      body: captured.requestBody,
    });
  });
});
