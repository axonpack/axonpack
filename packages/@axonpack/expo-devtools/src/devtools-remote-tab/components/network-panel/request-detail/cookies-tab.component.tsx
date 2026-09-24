import type { NetworkLogEntry } from '../../../../features/network/stores/network-log.store';
import {
  parseCookieHeader,
  requestCookies,
  responseCookies,
  type Cookie,
} from '../../../../features/network/utils/cookies.util';
import { DataTable } from '../data-table.component';

function table(title: string, cookies: Cookie[]) {
  if (cookies.length === 0) return null;
  return (
    <details key={title} open className="axonpack-net-section">
      <summary>
        {title}
        <span className="axonpack-net-count">({cookies.length})</span>
      </summary>
      <DataTable
        flex={1}
        columns={[
          { label: 'Name', width: 120 },
          { label: 'Value', width: 0 },
          { label: 'Domain', width: 120 },
          { label: 'Path', width: 60 },
          { label: 'Expires / Max-Age', width: 140 },
          { label: 'HttpOnly', width: 70 },
          { label: 'Secure', width: 60 },
          { label: 'SameSite', width: 70 },
        ]}
        rows={cookies.map((cookie, index) => ({
          key: `${index}-${cookie.name}`,
          cells: [
            cookie.name,
            cookie.value,
            cookie.domain ?? '',
            cookie.path ?? '',
            cookie.expires ?? cookie.maxAge ?? '',
            cookie.httpOnly ? '✓' : '',
            cookie.secure ? '✓' : '',
            cookie.sameSite ?? '',
          ],
        }))}
      />
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
