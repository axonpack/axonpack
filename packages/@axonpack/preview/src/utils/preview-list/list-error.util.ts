import type { PreviewListLabels } from "../../components/preview-list/preview-list.types";
import { checkBucketUrl } from "../config/config.util";
import { hostPortOf } from "../previews/running.util";

type ErrorLabels = Pick<
  PreviewListLabels,
  | "errorUnreachable"
  | "errorEmulatorHint"
  | "errorForbidden"
  | "errorForbiddenHint"
  | "errorNotFound"
  | "errorNotFoundHint"
  | "errorGeneric"
>;

// The ways fetch says the host did not answer: Android's OkHttp, iOS's NSURLSession, and Node.
const UNREACHABLE =
  /fetch failed|network request failed|failed to connect|connectexception|econnrefused|unknownhostexception|could not connect|timed out|offline/i;
const FORBIDDEN = /\b403\b|access ?denied|forbidden/i;
const NOT_FOUND = /\b404\b|nosuchbucket|nosuchkey|not found/i;
// On the emulator these are the emulator itself, not the computer.
const LOOPBACK = new Set(["localhost", "127.0.0.1"]);

const badBucketUrl = (url: string) => {
  try {
    checkBucketUrl(url);
    return false;
  } catch {
    return true;
  }
};

/**
 * A list error in words QA can act on: what went wrong, then what to try. The hint is the raw
 * text only when no plainer words fit; otherwise that belongs in the console. A bad bucket URL is
 * baked into the build, so asking again can't help and there is no Retry.
 */
export function describeListError(
  raw: string,
  input: { bucketUrl: string; platform: string | null; labels: ErrorLabels },
): { message: string; hint: string | null; retryable: boolean } {
  const { labels } = input;
  const retryable = !badBucketUrl(input.bucketUrl);
  if (UNREACHABLE.test(raw)) {
    const authority = /^\w+:\/\/([^/?#]+)/.exec(input.bucketUrl)?.[1] ?? "";
    const hostPort = hostPortOf(input.bucketUrl) ?? authority;
    const at = hostPort.lastIndexOf(":");
    const host = hostPort.slice(0, at).toLowerCase();
    const port = hostPort.slice(at + 1);
    return {
      message: labels.errorUnreachable.replace("{host}", authority),
      hint:
        input.platform === "android" && LOOPBACK.has(host)
          ? labels.errorEmulatorHint.replaceAll("{port}", port)
          : null,
      retryable,
    };
  }
  const hinted = (message: string, hint: string) => ({
    message,
    hint: hint || null,
    retryable,
  });
  if (FORBIDDEN.test(raw))
    return hinted(labels.errorForbidden, labels.errorForbiddenHint);
  if (NOT_FOUND.test(raw))
    return hinted(labels.errorNotFound, labels.errorNotFoundHint);
  return hinted(labels.errorGeneric, raw);
}
