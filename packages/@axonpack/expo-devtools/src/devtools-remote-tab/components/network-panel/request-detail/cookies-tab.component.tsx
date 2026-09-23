import type { NetworkLogEntry } from '../../../../features/network/stores/network-log.store';
import {
  parseCookieHeader,
  requestCookies,
  responseCookies,
  type Cookie,
} from '../../../../features/network/utils/cookies.util';

function table(title: string, cookies: Cookie[]) {
  if (cookies.length === 0) return null;
  return (
    <details key={title} open className="axonpack-net-section">
      <summary>
        {title}
        <span className="axonpack-net-count">({cookies.length})</span>
      </summary>
      <table className="axonpack-net-cookies">
        <thead>
          <tr>
            {['Name', 'Value', 'Domain', 'Path', 'Expires / Max-Age', 'HttpOnly', 'Secure', 'SameSite'].map(
              (label) => (
                <th key={label}>{label}</th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {cookies.map((cookie, index) => (
            <tr key={`${index}-${cookie.name}`}>
              <td>{cookie.name}</td>
              <td>{cookie.value}</td>
              <td>{cookie.domain}</td>
              <td>{cookie.path}</td>
              <td>{cookie.expires ?? cookie.maxAge}</td>
              <td>{cookie.httpOnly ? '✓' : ''}</td>
              <td>{cookie.secure ? '✓' : ''}</td>
              <td>{cookie.sameSite}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** The same three lists as the app's Cookies tab, in Chrome's table. */
export function CookiesTab({ entry }: { entry: NetworkLogEntry }) {
  const sent = requestCookies(entry.requestHeaders);
  const received = responseCookies(entry.responseHeaders);

  if (sent.length === 0 && received.length === 0 && entry.pageCookies === undefined) {
    return <p className="axonpack-net-none">This request sent no cookies, and set none.</p>;
  }

  return (
    <div>
      {table('Request Cookies', sent)}
      {table('Response Cookies', received)}
      {entry.pageCookies !== undefined &&
        table('Visible to the page', parseCookieHeader(entry.pageCookies))}
      {/* Only what these headers carried is visible. The platform's own jar cannot be read. */}
      <p className="axonpack-net-none">
        Read from this request's Cookie and Set-Cookie headers. A cookie the platform attached from
        an earlier response without it showing here is not visible to this panel.
      </p>
    </div>
  );
}
