import { Credentials, EMPTY_SHA256, sha256Hex, signRequest } from "./sigv4";

/** Any S3-compatible bucket: AWS S3, Cloudflare R2, MinIO and others. Path-style URLs. */
export type S3Config = {
  endpoint: string;
  /** Left out when `endpoint` already is the bucket's base, as for the app's unsigned reads. */
  bucket?: string;
  /** Folder inside the bucket that everything goes under, so several apps can share one bucket. */
  prefix?: string;
  region: string;
  /** Write key in the CLI, read-only key in the app. Without one, requests go unsigned. */
  credentials?: Credentials;
  /** Sent with every request, such as a header a proxy or tunnel in front of the bucket wants. */
  headers?: Record<string, string>;
};

/** MinIO and R2 accept it too, so a region is only needed for AWS buckets elsewhere. */
export const DEFAULT_REGION = "us-east-1";

const trimSlash = (s: string) => s.replace(/\/+$/, "");
const encodeKey = (key: string) =>
  key.split("/").map(encodeURIComponent).join("/");

/**
 * Splits one URL, `<endpoint>/<bucket>[/<prefix>]`, so a single setting says where everything
 * lives: `http://localhost:9000/previews-public`, `https://<account>.r2.cloudflarestorage.com/previews/my-app`.
 */
export function parseBucketUrl(
  value: string,
): Pick<S3Config, "endpoint" | "bucket" | "prefix"> {
  // Plain string parsing rather than `URL`, so the CLI and the app read it the same way whatever
  // URL implementation the JS engine has. Empty segments are dropped, so slashes at the end or
  // doubled in the middle change nothing.
  const match = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]+)([^?#]*)/i.exec(
    value.trim(),
  );
  if (!match) throw new Error(`${value} is not a URL: use <endpoint>/<bucket>`);
  const [, scheme, host, path] = match;
  const [bucket, ...rest] = path.split("/").filter(Boolean);
  if (!bucket)
    throw new Error(`${value} has no bucket: use <endpoint>/<bucket>`);
  return {
    endpoint: `${scheme.toLowerCase()}://${host}`,
    bucket,
    prefix: rest.length > 0 ? rest.join("/") : undefined,
  };
}

const withPrefix = (config: S3Config, key: string) =>
  config.prefix ? `${config.prefix}/${key}` : key;

const bucketUrl = (config: S3Config) =>
  config.bucket
    ? `${trimSlash(config.endpoint)}/${config.bucket}`
    : trimSlash(config.endpoint);

export const objectUrl = (config: S3Config, key: string) =>
  `${bucketUrl(config)}/${encodeKey(withPrefix(config, key))}`;

export class S3Error extends Error {
  constructor(
    readonly status: number,
    readonly key: string,
    body: string,
  ) {
    super(`S3 ${status} for ${key}: ${body.slice(0, 300)}`);
  }
}

type Request = {
  method: string;
  key?: string;
  query?: Record<string, string>;
  body?: Uint8Array | string;
  headers?: Record<string, string>;
};

export async function s3Fetch(
  config: S3Config,
  request: Request,
): Promise<Response> {
  const base =
    request.key === undefined
      ? bucketUrl(config)
      : objectUrl(config, request.key);
  const url = new URL(base);
  for (const [k, v] of Object.entries(request.query ?? {}))
    url.searchParams.set(k, v);
  let headers = { ...config.headers, ...request.headers };
  if (config.credentials) {
    headers = signRequest({
      method: request.method,
      url: url.toString(),
      region: config.region,
      credentials: config.credentials,
      headers,
      payloadHash:
        request.body === undefined ? EMPTY_SHA256 : sha256Hex(request.body),
    });
  }
  return fetch(url, {
    method: request.method,
    headers,
    body: request.body as BodyInit | undefined,
  });
}

/** Null when the object does not exist. The ETag is what a conditional put needs. */
export async function getJson<T>(
  config: S3Config,
  key: string,
): Promise<{ data: T; etag: string | null } | null> {
  const res = await s3Fetch(config, { method: "GET", key });
  if (res.status === 404 || (res.status === 403 && !config.credentials))
    return null;
  const body = await res.text();
  if (!res.ok) throw new S3Error(res.status, key, body);
  try {
    return { data: JSON.parse(body) as T, etag: res.headers.get("etag") };
  } catch {
    throw new Error(notJsonMessage(objectUrl(config, key), res, body));
  }
}

/**
 * Something in front of the bucket answered instead of it: most often a private tunnel or proxy
 * sending a login page. Say what came back and from where, instead of a bare JSON parse error.
 */
export function notJsonMessage(
  url: string,
  res: Response,
  body: string,
): string {
  const type = res.headers.get("content-type")?.split(";")[0];
  const got = type || JSON.stringify(body.trim().slice(0, 80));
  const redirected =
    res.url && res.url !== url ? `, redirected to ${res.url}` : "";
  return `Expected JSON from ${url} but got ${got} (status ${res.status}${redirected}). Is the URL public, or does it need a read key or headers?`;
}

/**
 * False when a condition failed (someone else wrote first), so the caller can read again and
 * retry. `etag: null` means "only if it does not exist yet".
 */
export async function putObject(
  config: S3Config,
  key: string,
  body: Uint8Array | string,
  options: { contentType?: string; etag?: string | null } = {},
): Promise<boolean> {
  const headers: Record<string, string> = {
    "content-type": options.contentType ?? "application/octet-stream",
  };
  if (options.etag !== undefined) {
    if (options.etag === null) headers["if-none-match"] = "*";
    else headers["if-match"] = options.etag;
  }
  const res = await s3Fetch(config, { method: "PUT", key, body, headers });
  if (res.status === 412 || res.status === 409) return false;
  if (!res.ok) throw new S3Error(res.status, key, await res.text());
  return true;
}

export async function exists(config: S3Config, key: string): Promise<boolean> {
  const res = await s3Fetch(config, { method: "HEAD", key });
  if (res.status === 404) return false;
  if (!res.ok) throw new S3Error(res.status, key, "");
  return true;
}

export async function deleteObject(
  config: S3Config,
  key: string,
): Promise<void> {
  const res = await s3Fetch(config, { method: "DELETE", key });
  if (!res.ok && res.status !== 404)
    throw new S3Error(res.status, key, await res.text());
}

const unescapeXml = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

/** Every key under the prefix (ListObjectsV2, following continuation tokens). */
export async function listKeys(
  config: S3Config,
  prefix: string,
): Promise<string[]> {
  const keys: string[] = [];
  const strip = config.prefix ? config.prefix.length + 1 : 0;
  let token: string | undefined;
  do {
    const query: Record<string, string> = {
      "list-type": "2",
      prefix: withPrefix(config, prefix),
    };
    if (token) query["continuation-token"] = token;
    const res = await s3Fetch(config, { method: "GET", query });
    const xml = await res.text();
    if (!res.ok) throw new S3Error(res.status, prefix, xml);
    for (const match of xml.matchAll(/<Key>([^<]*)<\/Key>/g))
      keys.push(unescapeXml(match[1]).slice(strip));
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml)
      ? unescapeXml(/<NextContinuationToken>([^<]*)</.exec(xml)?.[1] ?? "")
      : undefined;
  } while (token);
  return keys;
}
