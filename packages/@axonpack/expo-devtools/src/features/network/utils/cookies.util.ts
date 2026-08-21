export type Cookie = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  maxAge?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: string;
};

/**
 * React Native's networking layer joins repeated response headers into one comma-separated string
 * (`NetworkingModule` does it on Android, and the JS side is handed a single-valued object either
 * way), so several `Set-Cookie` headers arrive as one. Splitting on every comma would break the
 * `Expires` date, which contains one — so a break only counts where the next thing is a new
 * `name=value` pair.
 */
/** What a new cookie looks like after a separating comma: a name, then `=`, with no spaces in it. */
const NEXT_PAIR = /^\s*[^;,=\s]+=/;

export function splitSetCookieHeader(header: string): string[] {
  const cookies: string[] = [];
  let start = 0;

  for (let i = 0; i < header.length; i += 1) {
    if (header[i] !== ',') continue;
    // A comma only separates cookies when a new pair begins after it. Inside an `Expires` value —
    // `Expires=Wed, 21 Oct 2026 07:28:00 GMT` — what follows is a date, so the comma is part of it.
    if (!NEXT_PAIR.test(header.slice(i + 1))) continue;
    cookies.push(header.slice(start, i));
    start = i + 1;
  }

  cookies.push(header.slice(start));
  return cookies.map((cookie) => cookie.trim()).filter((cookie) => cookie.length > 0);
}

export function parseSetCookie(header: string): Cookie {
  const [pair, ...attributes] = header.split(';').map((part) => part.trim());
  const [name, ...valueParts] = pair.split('=');

  const cookie: Cookie = { name: name.trim(), value: valueParts.join('=').trim() };

  for (const attribute of attributes) {
    const [rawName, ...rawValue] = attribute.split('=');
    const value = rawValue.join('=').trim();

    switch (rawName.trim().toLowerCase()) {
      case 'domain':
        cookie.domain = value;
        break;
      case 'path':
        cookie.path = value;
        break;
      case 'expires':
        cookie.expires = value;
        break;
      case 'max-age':
        cookie.maxAge = value;
        break;
      case 'samesite':
        cookie.sameSite = value;
        break;
      // Both are flags, so their presence is the value.
      case 'secure':
        cookie.secure = true;
        break;
      case 'httponly':
        cookie.httpOnly = true;
        break;
    }
  }

  return cookie;
}

/** A request's `Cookie` header is one line of `name=value` pairs, with no attributes on any of them. */
export function parseCookieHeader(header: string): Cookie[] {
  return header
    .split(';')
    .map((part) => {
      const [name, ...valueParts] = part.trim().split('=');
      return { name: name.trim(), value: valueParts.join('=').trim() };
    })
    .filter((cookie) => cookie.name.length > 0);
}

/** Header names arrive in whatever case the server or the platform used. */
function findHeader(headers: Record<string, string> | undefined, name: string): string | undefined {
  if (!headers) return undefined;
  const wanted = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === wanted) return headers[key];
  }
  return undefined;
}

export function requestCookies(headers: Record<string, string> | undefined): Cookie[] {
  const header = findHeader(headers, 'cookie');
  return header ? parseCookieHeader(header) : [];
}

export function responseCookies(headers: Record<string, string> | undefined): Cookie[] {
  const header = findHeader(headers, 'set-cookie');
  return header ? splitSetCookieHeader(header).map(parseSetCookie) : [];
}
