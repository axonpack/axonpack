import { NotFoundError, ParseError } from "../errors";
import { request } from "../http";
import type { Provider, ProviderContext, ProviderResult } from "../types";

type LookupResult = {
  version?: string;
  trackId?: number;
  releaseNotes?: string;
  currentVersionReleaseDate?: string;
};

export const appStoreUrl = (appId: string | number, country?: string): string =>
  `itms-apps://apps.apple.com/${country ? `${country.toLowerCase()}/` : ""}app/id${appId}`;

const lookup = async (
  context: ProviderContext,
  country: string | undefined,
): Promise<LookupResult | undefined> => {
  const query = new URLSearchParams({ bundleId: context.packageName ?? "" });
  if (country) query.set("country", country.toLowerCase());
  // The lookup sits behind a CDN that can serve a stale answer for hours after a release.
  query.set("date", String(Date.now()));
  const response = await request(
    `https://itunes.apple.com/lookup?${query}`,
    context,
  );
  let json: { resultCount?: number; results?: LookupResult[] };
  try {
    json = (await response.json()) as typeof json;
  } catch (cause) {
    throw new ParseError(
      `App Store lookup did not return JSON: ${String(cause)}`,
    );
  }
  return json.resultCount ? json.results?.[0] : undefined;
};

/** The iTunes Search API's `lookup` endpoint. Tries the device storefront, then `fallbackCountry`. */
export const appStore: Provider = {
  async getVersion(context) {
    const { country, fallbackCountry = "us" } = context;
    const tried: (string | undefined)[] = [];
    for (const candidate of [country, fallbackCountry]) {
      if (tried.includes(candidate)) continue;
      tried.push(candidate);
      const hit = await lookup(context, candidate);
      if (!hit) continue;
      if (!hit.version)
        throw new ParseError("App Store lookup result has no version.");
      const result: ProviderResult = {
        version: hit.version,
        storeUrl: hit.trackId ? appStoreUrl(hit.trackId, candidate) : undefined,
        releaseNotes: hit.releaseNotes,
        releaseDate: hit.currentVersionReleaseDate,
      };
      return result;
    }
    throw new NotFoundError(
      `No App Store listing for ${context.packageName} in ${tried.join(", ")}.`,
    );
  },
};

/** Numeric App Store id for a bundle id, when the caller did not supply one. */
export const lookupAppId = async (
  context: ProviderContext,
): Promise<string | undefined> => {
  const hit =
    (await lookup(context, context.country)) ??
    (await lookup(context, context.fallbackCountry ?? "us"));
  return hit?.trackId ? String(hit.trackId) : undefined;
};
