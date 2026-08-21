import { responseFileName } from '../share-response-body.util';

const entry = (url: string, mimeType?: string) =>
  ({ url, mimeType }) as Parameters<typeof responseFileName>[0];

describe('responseFileName', () => {
  it('keeps an extension the URL already had', () => {
    expect(responseFileName(entry('https://example.test/a/logo.png'))).toBe('logo.png');
  });

  it('adds one from the content type when the URL has none', () => {
    expect(responseFileName(entry('https://example.test/api/users', 'application/json'))).toBe(
      'users.json'
    );
  });

  it('ignores the query when naming the file', () => {
    expect(
      responseFileName(entry('https://example.test/report?year=2026', 'application/pdf'))
    ).toBe('report.pdf');
  });

  it('falls back to a name for a URL with no path at all', () => {
    expect(responseFileName(entry('https://example.test'))).toBe('example.test');
    expect(responseFileName(entry('https://example.test/'))).toBe('example.test');
  });

  it('strips characters a filesystem would refuse', () => {
    expect(responseFileName(entry('https://example.test/a b:c'))).toBe('a_b_c');
  });
});
