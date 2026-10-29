import type { PreviewListLabels } from "../../components/preview-list/preview-list.types";
import { hostPortOf } from "../previews/running.util";

type ErrorLabels = Pick<
  PreviewListLabels,
  | "errorUnreachable"
  | "errorEmulatorHint"
  | "errorForbidden"
  | "errorNotFound"
  | "errorGeneric"
>;

// The ways fetch says the host did not answer: Android's OkHttp, iOS's NSURLSession, and Node.
const UNREACHABLE =
  /fetch failed|network request failed|failed to connect|connectexception|econnrefused|unknownhostexception|could not connect|timed out|offline/i;
const FORBIDDEN = /\b403\b|access ?denied|forbidden/i;
const NOT_FOUND = /\b404\b|nosuchbucket|nosuchkey|not found/i;
// On the emulator these are the emulator itself, not the computer.
const LOOPBACK = new Set(["localhost", "127.0.0.1"]);

/**
 * A list error in words QA can act on. `detail` is the raw text, kept only when no plainer words
 * fit; otherwise it belongs in the console.
 */
export function describeListError(
  raw: string,
  input: { bucketUrl: string; platform: string | null; labels: ErrorLabels },
): { message: string; detail: string | null } {
  const { labels } = input;
  if (UNREACHABLE.test(raw)) {
    const authority = /^\w+:\/\/([^/?#]+)/.exec(input.bucketUrl)?.[1] ?? "";
    const hostPort = hostPortOf(input.bucketUrl) ?? authority;
    const at = hostPort.lastIndexOf(":");
    const host = hostPort.slice(0, at).toLowerCase();
    const port = hostPort.slice(at + 1);
    const unreachable = labels.errorUnreachable.replace("{host}", authority);
    const hint =
      input.platform === "android" && LOOPBACK.has(host)
        ? ` ${labels.errorEmulatorHint.replaceAll("{port}", port)}`
        : "";
    return { message: unreachable + hint, detail: null };
  }
  if (FORBIDDEN.test(raw))
    return { message: labels.errorForbidden, detail: null };
  if (NOT_FOUND.test(raw))
    return { message: labels.errorNotFound, detail: null };
  return { message: labels.errorGeneric, detail: raw };
}
