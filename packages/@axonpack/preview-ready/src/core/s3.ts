import { Credentials, EMPTY_SHA256, sha256Hex, signRequest } from "./sigv4";

/** Any S3-compatible bucket: AWS S3, Cloudflare R2, MinIO and others. Path-style URLs. */
export type S3Config = {
  endpoint: string;
  bucket: string;
  region: string;
  /** Write key in the CLI, read-only key in the app. Without one, requests go unsigned. */
  credentials?: Credentials;
  /** Where public reads go when that isn't `<endpoint>/<bucket>`, such as R2's r2.dev address. */
  publicUrl?: string;
};

const trimSlash = (s: string) => s.replace(/\/+$/, "");
const encodeKey = (key: string) =>
  key.split("/").map(encodeURIComponent).join("/");

export const objectUrl = (config: S3Config, key: string) =>
  `${trimSlash(config.endpoint)}/${config.bucket}/${encodeKey(key)}`;

/** The address the app reads from: the public URL for an unsigned bucket, else the endpoint. */
export const readUrl = (config: S3Config, key: string) =>
  config.publicUrl && !config.credentials
    ? `${trimSlash(config.publicUrl)}/${encodeKey(key)}`
    : objectUrl(config, key);

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
      ? objectUrl(config, "").replace(/\/$/, "")
      : readUrl(config, request.key);
  const url = new URL(base);
  for (const [k, v] of Object.entries(request.query ?? {}))
    url.searchParams.set(k, v);
  let headers = { ...request.headers };
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
  if (!res.ok) throw new S3Error(res.status, key, await res.text());
  return { data: (await res.json()) as T, etag: res.headers.get("etag") };
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
  let token: string | undefined;
  do {
    const query: Record<string, string> = { "list-type": "2", prefix };
    if (token) query["continuation-token"] = token;
    const res = await s3Fetch(config, { method: "GET", query });
    const xml = await res.text();
    if (!res.ok) throw new S3Error(res.status, prefix, xml);
    for (const match of xml.matchAll(/<Key>([^<]*)<\/Key>/g))
      keys.push(unescapeXml(match[1]));
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml)
      ? unescapeXml(/<NextContinuationToken>([^<]*)</.exec(xml)?.[1] ?? "")
      : undefined;
  } while (token);
  return keys;
}
