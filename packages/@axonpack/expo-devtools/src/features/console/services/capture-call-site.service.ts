import { parseStack, type StackFrame } from '../../../core/utils/parse-stack.util';

/**
 * This package's own frames, which sit on top of every stack captured from inside the console patch.
 * Matched by file name, and narrowly: keying off the package name would also match an app whose path
 * happens to contain it — the network patch learned that the hard way, where it swallowed the caller
 * in this package's own example app.
 */
const OWN_FRAME_PATTERN = /(patch-console|capture-call-site)/;

/**
 * Where a log came from. LogBox shows this and the panel did not, which is the whole of why it
 * exists — a hundred identical warnings are worth very little without the line that produced them.
 *
 * Only the cheap half happens here: throw, keep the frames. Turning them into a file name needs the
 * development server, so that waits until a row is on screen asking for it.
 */
export function captureCallSite(): StackFrame[] {
  return dropOwnFrames(parseStack(new Error().stack ?? null));
}

/** Pure, and exported for that reason: a test cannot assert against a real stack taken in here. */
export function dropOwnFrames(frames: StackFrame[]): StackFrame[] {
  let start = 0;
  while (start < frames.length && OWN_FRAME_PATTERN.test(frames[start].location)) start += 1;
  return frames.slice(start);
}

/** The frame worth showing: the nearest one that is the app's own code rather than a library's. */
export function primaryCallSite(frames: StackFrame[]): StackFrame | undefined {
  return frames.find((frame) => !frame.vendor) ?? frames[0];
}
