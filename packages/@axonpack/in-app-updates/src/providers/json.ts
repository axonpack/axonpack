import { ParseError } from "../errors";
import { request } from "../http";
import type { Provider, ProviderContext, ProviderResult } from "../types";

export type JsonProviderOptions = {
  /** A string, or a function to build it per platform or app. */
  url: string | ((context: ProviderContext) => string);
  headers?: Record<string, string>;
  /**
   * Turn the response into a result. The default reads
   * `{ latestVersion | version, minimumVersion, storeUrl, releaseNotes, releaseDate, buildNumber }`
   * from the top level, or from the key named after the platform when that is an object.
   */
  parse?: (json: any, context: ProviderContext) => ProviderResult;
};

const text = (value: unknown): string | undefined =>
  typeof value === "string" || typeof value === "number"
    ? String(value)
    : undefined;

export const defaultParse = (
  json: any,
  context: ProviderContext,
): ProviderResult => {
  const node = (context.platform && json?.[context.platform]) || json;
  const version = text(node?.latestVersion ?? node?.version);
  if (!version)
    throw new ParseError('JSON response has no "latestVersion" or "version".');
  return {
    version,
    minimumVersion: text(node.minimumVersion ?? node.minVersion),
    storeUrl: text(node.storeUrl),
    releaseNotes: text(node.releaseNotes),
    releaseDate: text(node.releaseDate),
    buildNumber: node.buildNumber ?? node.latestBuildNumber,
  };
};

/** Your own endpoint: a static file, an API, or a remote config service via `parse`. */
export const jsonProvider = ({
  url,
  headers,
  parse = defaultParse,
}: JsonProviderOptions): Provider => ({
  async getVersion(context) {
    const response = await request(
      typeof url === "function" ? url(context) : url,
      {
        ...context,
        fetchOptions: { ...context.fetchOptions, headers: { ...headers } },
      },
    );
    let json: unknown;
    try {
      json = await response.json();
    } catch (cause) {
      throw new ParseError(`Endpoint did not return JSON: ${String(cause)}`);
    }
    return parse(json, context);
  },
});
