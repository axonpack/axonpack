import {
  parseCookieHeader,
  parseSetCookie,
  requestCookies,
  responseCookies,
  splitSetCookieHeader,
} from '../cookies.util';

describe('splitSetCookieHeader', () => {
  // The whole reason this is not a `split(',')`: an Expires date carries its own comma.
  it('keeps a cookie whose Expires date contains a comma intact', () => {
    const header = 'id=abc; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/';

    expect(splitSetCookieHeader(header)).toEqual([header]);
  });

  it('splits several cookies that the platform joined', () => {
    expect(
      splitSetCookieHeader('a=1; Path=/, b=2; Expires=Wed, 21 Oct 2026 07:28:00 GMT, c=3')
    ).toEqual(['a=1; Path=/', 'b=2; Expires=Wed, 21 Oct 2026 07:28:00 GMT', 'c=3']);
  });

  it('is empty for an empty header', () => {
    expect(splitSetCookieHeader('')).toEqual([]);
  });
});

describe('parseSetCookie', () => {
  it('reads the pair and every attribute it knows', () => {
    expect(
      parseSetCookie(
        'session=xyz%3D; Domain=example.test; Path=/app; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Max-Age=3600; SameSite=Lax; Secure; HttpOnly'
      )
    ).toEqual({
      name: 'session',
      value: 'xyz%3D',
      domain: 'example.test',
      path: '/app',
      expires: 'Wed, 21 Oct 2026 07:28:00 GMT',
      maxAge: '3600',
      sameSite: 'Lax',
      secure: true,
      httpOnly: true,
    });
  });

  // A base64 value ends in `=`, so the split has to keep everything after the first one.
  it('keeps a value that contains its own equals sign', () => {
    expect(parseSetCookie('t=YWJjZA==; Path=/').value).toBe('YWJjZA==');
  });

  it('reads a bare pair with no attributes', () => {
    expect(parseSetCookie('a=1')).toEqual({ name: 'a', value: '1' });
  });
});

describe('parseCookieHeader', () => {
  it('reads the pairs a request sent', () => {
    expect(parseCookieHeader('a=1; b=2')).toEqual([
      { name: 'a', value: '1' },
      { name: 'b', value: '2' },
    ]);
  });

  it('drops an empty segment rather than yielding a nameless cookie', () => {
    expect(parseCookieHeader('a=1;; ')).toEqual([{ name: 'a', value: '1' }]);
  });
});

describe('from headers', () => {
  it('finds the header whatever case it arrived in', () => {
    expect(requestCookies({ Cookie: 'a=1' })).toEqual([{ name: 'a', value: '1' }]);
    expect(responseCookies({ 'SET-COOKIE': 'b=2' })).toEqual([{ name: 'b', value: '2' }]);
  });

  it('is empty when the header is absent', () => {
    expect(requestCookies({ 'content-type': 'text/plain' })).toEqual([]);
    expect(responseCookies(undefined)).toEqual([]);
  });
});
