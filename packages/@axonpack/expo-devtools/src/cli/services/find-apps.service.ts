export const DEFAULT_PORTS = Array.from({ length: 10 }, (_, i) => 8081 + i);

/** The page dev-middleware adds for React Native below 0.76, which has no stable page of its own. */
const LEGACY_PAGE = 'React Native Experimental (Improved Chrome Reloads)';
const HTTP_TIMEOUT_MS = 2000;

type MetroPage = {
  title: string;
  appId: string;
  deviceName: string;
  webSocketDebuggerUrl: string;
  reactNative?: {
    logicalDeviceId?: string;
    capabilities?: { nativePageReloads?: boolean; supportsMultipleDebuggers?: boolean };
  };
};

export type App = {
  /** The Expo slug, or the page's app id where Metro serves no Expo manifest. */
  slug: string;
  name?: string;
  device: string;
  port: number;
  /** The debugger socket to attach to. */
  url: string;
  /**
   * False on React Native below 0.86 or an Expo started headless: attaching then closes a React
   * Native DevTools window that is open on the app.
   */
  multipleDebuggers: boolean;
};

export async function findApps(ports: readonly number[]): Promise<App[]> {
  return (await Promise.all(ports.map(appsOnPort))).flat();
}

async function appsOnPort(port: number): Promise<App[]> {
  const base = `http://127.0.0.1:${port}`;
  const status = await get(`${base}/status`)
    .then((response) => response.text())
    .catch(() => '');
  if (!status.includes('packager-status:running')) return [];

  // Read once per command: while a device has no page yet, each read prints a 7-line warning in
  // Metro's terminal.
  const [pages, manifest] = await Promise.all([
    get(`${base}/json/list`)
      .then((response) => response.json() as Promise<MetroPage[]>)
      .catch((): MetroPage[] => []),
    // In Expo Go every page's appId is `host.exp.Exponent`, so the slug has to come from here.
    get(base, { accept: 'application/expo+json', 'expo-platform': 'ios' })
      .then((response) => response.json())
      .catch(() => null),
  ]);
  const expo: { slug?: string; name?: string } | undefined = manifest?.extra?.expoClient;

  // Metro lists a device's newest page last, and an old one can linger after a reload.
  const newest = new Map<string, MetroPage>();
  for (const page of Array.isArray(pages) ? pages : []) {
    if (page.reactNative?.capabilities?.nativePageReloads || page.title === LEGACY_PAGE) {
      newest.set(`${page.reactNative?.logicalDeviceId}\n${page.appId}`, page);
    }
  }
  return [...newest.values()].map((page) => ({
    slug: expo?.slug ?? page.appId,
    name: expo?.name,
    device: page.deviceName,
    port,
    url: page.webSocketDebuggerUrl,
    multipleDebuggers: page.reactNative?.capabilities?.supportsMultipleDebuggers === true,
  }));
}

function get(url: string, headers?: Record<string, string>) {
  return fetch(url, { headers, signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
}

/** The one app `--app` and `--device` leave, or the message that says why there isn't one. */
export function pickApp(
  apps: readonly App[],
  want: { app?: string; device?: string }
): App | string {
  const slug = want.app?.toLowerCase();
  const device = want.device?.toLowerCase();
  const matches = apps.filter(
    (each) =>
      (slug === undefined || each.slug.toLowerCase() === slug) &&
      (device === undefined || each.device.toLowerCase().includes(device))
  );
  if (matches.length === 1) return matches[0];
  const list = (from: readonly App[]) =>
    from.map((each) => `  --app ${each.slug} --device '${each.device}'  (metro ${each.port})`);
  if (matches.length === 0) {
    return [`no app matches ${flags(want)}. Running:`, ...list(apps)].join('\n');
  }
  return [
    `${matches.length} apps match${want.app || want.device ? ` ${flags(want)}` : ''}. Pick one:`,
    ...list(matches),
  ].join('\n');
}

const flags = (want: { app?: string; device?: string }) =>
  [want.app && `--app ${want.app}`, want.device && `--device ${want.device}`]
    .filter(Boolean)
    .join(' ');
