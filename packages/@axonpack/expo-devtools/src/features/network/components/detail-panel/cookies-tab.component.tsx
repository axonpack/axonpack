import { Text, View } from 'react-native';

import { useRowStyles } from './shared.styles';
import { makeThemedStyles } from '../../../../core/utils/themed-styles.util';
import type { NetworkLogEntry } from '../../stores/network-log.store';
import {
  parseCookieHeader,
  requestCookies,
  responseCookies,
  type Cookie,
} from '../../utils/cookies.util';

/** The attributes worth a line, in the order a browser's cookie table shows them. */
function attributes(cookie: Cookie): string[] {
  const parts: string[] = [];
  if (cookie.domain) parts.push(`Domain=${cookie.domain}`);
  if (cookie.path) parts.push(`Path=${cookie.path}`);
  if (cookie.expires) parts.push(`Expires=${cookie.expires}`);
  if (cookie.maxAge) parts.push(`Max-Age=${cookie.maxAge}`);
  if (cookie.sameSite) parts.push(`SameSite=${cookie.sameSite}`);
  if (cookie.secure) parts.push('Secure');
  if (cookie.httpOnly) parts.push('HttpOnly');
  return parts;
}

function CookieList({ title, cookies }: { title: string; cookies: Cookie[] }) {
  const rowStyles = useRowStyles();
  const styles = useStyles();

  if (cookies.length === 0) return null;

  return (
    <View style={rowStyles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {cookies.map((cookie, index) => (
        <View key={`${index}-${cookie.name}`} style={styles.cookie}>
          <View style={rowStyles.headerRow}>
            <Text style={rowStyles.headerListKey} selectable>
              {cookie.name}
            </Text>
            <Text style={rowStyles.headerValue} selectable>
              {cookie.value}
            </Text>
          </View>
          {attributes(cookie).length > 0 && (
            <Text style={styles.attributes} selectable>
              {attributes(cookie).join(' · ')}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

export function CookiesTab({ entry }: { entry: NetworkLogEntry }) {
  const styles = useStyles();
  const sent = requestCookies(entry.requestHeaders);
  const received = responseCookies(entry.responseHeaders);

  if (sent.length === 0 && received.length === 0 && entry.pageCookies === undefined) {
    return <Text style={styles.empty}>This request sent no cookies, and set none.</Text>;
  }

  return (
    <View>
      <CookieList title="Sent" cookies={sent} />
      <CookieList title="Set by the response" cookies={received} />
      {entry.pageCookies !== undefined && (
        <CookieList title="Visible to the page" cookies={parseCookieHeader(entry.pageCookies)} />
      )}
      {/* Only what these headers carried is visible — the platform's own jar cannot be read. */}
      <Text style={styles.note}>
        Read from the Cookie and Set-Cookie headers of this request. A cookie the platform attached
        from an earlier response, without it appearing here, is not visible to this panel.
      </Text>
      {entry.pageCookies !== undefined && (
        // A page cannot read the Cookie header its own engine writes, and an HttpOnly cookie is
        // invisible to it by design — so this list is what the document could see, not what went out.
        <Text style={styles.note}>
          The page&apos;s own cookies come from `document.cookie`, which is what that document could
          read: cookies for another path or marked HttpOnly are absent from it, and it is not a
          record of what this request sent.
        </Text>
      )}
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    paddingBottom: 2,
  },
  cookie: {
    paddingBottom: 4,
  },
  attributes: {
    fontSize: 10,
    color: COLORS.textSecondary,
    paddingLeft: 2,
  },
  empty: {
    padding: 12,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  note: {
    padding: 12,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
}));
