import { ParseError } from "../errors";
import { request } from "../http";
import { getNativeUpdateInfo, isNativeUpdateSupported } from "../native-update";
import type { Provider, ProviderContext } from "../types";

export const playStoreUrl = (packageName: string): string =>
  `https://play.google.com/store/apps/details?id=${packageName}`;

const VERSION = "(\\d+(?:[.-]\\d+)*(?:-[0-9A-Za-z.]+)?)";

/**
 * Play has no API for this, so the page is scraped. Layouts change, so each known shape gets a
 * pattern, tried in order. Add one here when Google changes the page again.
 */
export const PLAY_PATTERNS: RegExp[] = [
  // Old layout.
  new RegExp(`Current Version.+?>${VERSION}<\\/span>`),
  // Current layout: the version sits alone in a nested array inside AF_initDataCallback.
  new RegExp(`\\[\\[\\["${VERSION}"\\]\\]`),
  // Structured data, when present.
  new RegExp(`"softwareVersion"\\s*:\\s*"${VERSION}"`),
];

export const parsePlayStorePage = (html: string): string | undefined => {
  for (const pattern of PLAY_PATTERNS) {
    const match = pattern.exec(html);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
};

const withTimeout = <T>(work: Promise<T>, ms: number): Promise<T> => {
  if (!ms) return work;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
};

/**
 * The page shows only the version name, but a hotfix can ship with the same name and a higher
 * version code. Play's own update check knows about it, so it is asked when the Android module is
 * linked. It is a bonus: any failure here (no module, a sideloaded build, no answer in time) leaves
 * the answer from the page as it is.
 */
// The version code is the Android build number: the number in build.gradle or app.json android.versionCode.
const playVersionCode = async (
  context: ProviderContext,
): Promise<number | undefined> => {
  if (context.signal?.aborted || !isNativeUpdateSupported()) return undefined;
  try {
    const info = await withTimeout(
      getNativeUpdateInfo(),
      context.timeoutMs ?? 10_000,
    );
    return info?.available ? info.availableVersionCode : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Scrapes the public listing. Apps that show "Varies with device" have no version to read and
 * fail with a ParseError, so pair this with `chain(playStore, jsonProvider(...))` if that is you.
 */
export const playStore: Provider = {
  async getVersion(context) {
    const packageName = context.packageName ?? "";
    const response = await request(`${playStoreUrl(packageName)}&hl=en&gl=US`, {
      ...context,
      fetchOptions: {
        headers: { "sec-fetch-site": "same-origin" },
        ...context.fetchOptions,
      },
    });
    const version = parsePlayStorePage(await response.text());
    if (!version) {
      throw new ParseError(
        `The Play Store page for ${packageName} has no readable version. Google may have changed the page, or the app shows "Varies with device".`,
      );
    }
    return {
      version,
      storeUrl: playStoreUrl(packageName),
      buildNumber: await playVersionCode(context),
    };
  },
};
