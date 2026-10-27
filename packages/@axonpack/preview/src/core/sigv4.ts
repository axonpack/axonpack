import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

// AWS Signature Version 4, header form. Pure JS so the same code signs uploads in the CLI (Node)
// and private-bucket downloads in the app (Hermes, which has no WebCrypto).

export type Credentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

export type SignInput = {
  method: string;
  url: string;
  region: string;
  credentials: Credentials;
  /** Headers to send and sign. Host comes from the URL. */
  headers?: Record<string, string>;
  /** Hex sha256 of the body, or "UNSIGNED-PAYLOAD". Defaults to the hash of an empty body. */
  payloadHash?: string;
  service?: string;
  date?: Date;
  /** S3 needs `x-amz-content-sha256`; the generic AWS test suite signs without it. */
  addContentSha256?: boolean;
};

export const EMPTY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

export const sha256Hex = (data: Uint8Array | string): string =>
  bytesToHex(sha256(typeof data === "string" ? utf8ToBytes(data) : data));

const hmacBytes = (key: Uint8Array | string, data: string): Uint8Array =>
  hmac(
    sha256,
    typeof key === "string" ? utf8ToBytes(key) : key,
    utf8ToBytes(data),
  );

// RFC 3986: everything but unreserved characters is percent-encoded, which encodeURIComponent
// almost does; it leaves !'()* alone.
const encode = (value: string): string =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );

const canonicalPath = (pathname: string): string =>
  pathname
    .split("/")
    .map((segment) => encode(decodeURIComponent(segment)))
    .join("/") || "/";

const canonicalQuery = (search: URLSearchParams): string =>
  [...search.entries()]
    .map(([key, value]) => [encode(key), encode(value)])
    .sort(([ak, av], [bk, bv]) =>
      ak === bk ? (av < bv ? -1 : 1) : ak < bk ? -1 : 1,
    )
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

const amzDate = (date: Date): string =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

/** Returns the headers to send: the input headers plus the date, hash and Authorization. */
export function signRequest(input: SignInput): Record<string, string> {
  const url = new URL(input.url);
  const service = input.service ?? "s3";
  const payloadHash = input.payloadHash ?? EMPTY_SHA256;
  const timestamp = amzDate(input.date ?? new Date());
  const day = timestamp.slice(0, 8);

  const headers: Record<string, string> = { ...input.headers };
  headers["x-amz-date"] = timestamp;
  if (input.addContentSha256 ?? true)
    headers["x-amz-content-sha256"] = payloadHash;
  if (input.credentials.sessionToken) {
    headers["x-amz-security-token"] = input.credentials.sessionToken;
  }

  const signed = new Map<string, string>();
  signed.set("host", url.host);
  for (const [name, value] of Object.entries(headers)) {
    signed.set(name.toLowerCase(), value.trim().replace(/\s+/g, " "));
  }
  const names = [...signed.keys()].sort();
  const signedHeaders = names.join(";");

  const canonicalRequest = [
    input.method.toUpperCase(),
    canonicalPath(url.pathname),
    canonicalQuery(url.searchParams),
    names.map((name) => `${name}:${signed.get(name)}\n`).join(""),
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${day}/${input.region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    timestamp,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  let key = hmacBytes(`AWS4${input.credentials.secretAccessKey}`, day);
  key = hmacBytes(key, input.region);
  key = hmacBytes(key, service);
  key = hmacBytes(key, "aws4_request");
  const signature = bytesToHex(hmacBytes(key, stringToSign));

  headers.Authorization = `AWS4-HMAC-SHA256 Credential=${input.credentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return headers;
}
