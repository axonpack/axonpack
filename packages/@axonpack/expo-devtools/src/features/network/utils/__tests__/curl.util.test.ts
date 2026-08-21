import { buildCurlCommand } from '../curl.util';

describe('buildCurlCommand', () => {
  it('quotes a raw body and the headers around it', () => {
    const command = buildCurlCommand({
      method: 'POST',
      url: 'https://example.test/it',
      requestHeaders: { 'content-type': 'application/json' },
      requestBody: '{"a":1}',
    });

    expect(command).toContain("-H 'content-type: application/json'");
    expect(command).toContain(`--data-raw '{"a":1}'`);
  });

  it('escapes a single quote so the command does not break out of its own quoting', () => {
    expect(buildCurlCommand({ method: 'GET', url: "https://example.test/o'clock" })).toContain(
      `'https://example.test/o'\\''clock'`
    );
  });

  it('replays an upload with -F, and drops the boundary curl would not reuse', () => {
    const command = buildCurlCommand({
      method: 'POST',
      url: 'https://example.test/upload',
      requestHeaders: {
        'content-type': 'multipart/form-data; boundary=----abc',
        authorization: 'Bearer t',
      },
      requestBody: 'title=hi&photo=@a.jpg',
      requestFields: [
        { name: 'title', kind: 'text', value: 'hi' },
        { name: 'photo', kind: 'file', fileName: 'a.jpg' },
      ],
    });

    expect(command).toContain("-F 'title=hi'");
    expect(command).toContain("-F 'photo=@a.jpg'");
    expect(command).toContain("-H 'authorization: Bearer t'");
    expect(command).not.toContain('boundary');
    expect(command).not.toContain('--data-raw');
  });
});
