import {
  AbortedError,
  HttpError,
  NetworkError,
  TimeoutError,
  VersionCheckError,
} from "./errors";
import type { RequestOptions } from "./types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const attempt = async (
  url: string,
  options: RequestOptions,
): Promise<Response> => {
  const {
    timeoutMs = 10_000,
    signal,
    fetchOptions,
    fetch: doFetch = globalThis.fetch,
  } = options;
  if (signal?.aborted) throw new AbortedError();

  const controller = new AbortController();
  let timedOut = false;
  const timer = timeoutMs
    ? setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs)
    : undefined;
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    const response = await doFetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    if (!response.ok) throw new HttpError(response.status, url);
    return response;
  } catch (error) {
    if (error instanceof VersionCheckError) throw error;
    if (timedOut) throw new TimeoutError(timeoutMs);
    if (signal?.aborted) throw new AbortedError();
    throw new NetworkError(`Request to ${url} failed`, { cause: error });
  } finally {
    if (timer) clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
};

const isRetryable = (error: unknown): boolean =>
  error instanceof NetworkError ||
  error instanceof TimeoutError ||
  (error instanceof HttpError && (error.status === 429 || error.status >= 500));

export const request = async (
  url: string,
  options: RequestOptions = {},
): Promise<Response> => {
  const { retries = 1, retryDelayMs = 500 } = options;
  for (let tries = 0; ; tries++) {
    try {
      return await attempt(url, options);
    } catch (error) {
      if (tries >= retries || !isRetryable(error)) throw error;
      await sleep(retryDelayMs * 2 ** tries);
    }
  }
};
