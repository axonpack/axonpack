import { parseStack, type StackFrame } from '../../../core/utils/parse-stack.util';

/**
 * The instrumentation that sits on top of every stack this captures. Matched by the file names of
 * those three services and nothing broader: keying off the package name instead would also trim the
 * caller in any app whose own path happens to contain it — including this package's example app,
 * where it trimmed the entire stack.
 */
const OWN_FRAME_PATTERN = /(patch-fetch|patch-xhr|capture-initiator)/;

/**
 * Stacks are captured for every request, so this is deliberately the cheap half of the work: throw
 * an error, keep its frames, and stop. Turning those frames into file names and a source excerpt
 * costs a round trip to the dev server, so it waits until someone opens the Initiator tab.
 */
export function captureInitiatorFrames(): StackFrame[] {
  return dropOwnFrames(parseStack(new Error().stack ?? null));
}

/**
 * Everything above the caller is this package instrumenting the call, which is never the answer to
 * "which code made this request". Pure and exported so it can be checked against known frames — a
 * test cannot assert against a real stack here, since the test file's own path matches the pattern.
 */
export function dropOwnFrames(frames: StackFrame[]): StackFrame[] {
  let start = 0;
  while (start < frames.length && OWN_FRAME_PATTERN.test(frames[start].location)) start += 1;
  return frames.slice(start);
}

/** The frame a reader wants first: the nearest one that is the app's own code. */
export function primaryInitiatorFrame(frames: StackFrame[]): StackFrame | null {
  return frames.find((frame) => !frame.vendor) ?? frames[0] ?? null;
}
