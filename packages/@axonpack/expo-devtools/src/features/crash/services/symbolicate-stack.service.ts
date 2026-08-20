import { getUnpatchedFetch } from '../../../core/utils/unpatched-fetch.util';
import { parseFrameLocation } from '../utils/frame-location.util';
import { isVendorLocation, type StackFrame } from '../utils/parse-stack.util';

export type CrashCodeFrame = {
  /** Metro's own `@babel/code-frame` output — the source lines, the `>` marker and the caret. */
  content: string;
  fileName: string;
  location: { row: number; column: number } | null;
};

export type SymbolicatedStack = {
  frames: StackFrame[];
  componentFrames: StackFrame[];
  /**
   * One per stack that had a mappable frame — the error's, then the component's. React Native shows
   * the same two and titles the section "Sources" when both are there.
   */
  codeFrames: CrashCodeFrame[];
};

/**
 * A frame from a Metro bundle names the bundle, not the file: `index.bundle:104857:23`. The source
 * map that turns that back into `StackDemo.tsx:24:11` lives on the dev server, so the only way to
 * read one is to ask — which is exactly what React Native's own LogBox does, and why its call stack
 * is legible where a raw one isn't.
 *
 * The dev server is discovered from the frames themselves rather than from RN's `getDevServer`,
 * which is a deep and version-specific import. That also makes it a tighter gate than `__DEV__`:
 * nothing is contacted unless the trace it came from was served over http in the first place, so a
 * release build asks nobody.
 */
const HTTP_ORIGIN = /^(https?:\/\/[^/]+)\//i;

/** A dev server that has since gone away must not leave the section waiting on it. */
const REQUEST_TIMEOUT_MS = 3000;

/** Built at runtime because a literal ESC in a regex trips `no-control-regex`. */
const ANSI_ESCAPE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

type RawFrame = {
  methodName?: unknown;
  file?: unknown;
  lineNumber?: unknown;
  column?: unknown;
  collapse?: unknown;
};

const inFlight = new Map<string, Promise<SymbolicatedStack | null>>();
const results = new Map<string, SymbolicatedStack>();

function findDevServerOrigin(frames: StackFrame[]): string | null {
  for (const frame of frames) {
    const origin = HTTP_ORIGIN.exec(parseFrameLocation(frame.location).file)?.[1];
    if (origin !== undefined) return origin;
  }
  return null;
}

function toRequestFrame(frame: StackFrame) {
  const { file, lineNumber, column } = parseFrameLocation(frame.location);
  return { file, lineNumber: lineNumber ?? 0, column: column ?? 0, methodName: frame.fn };
}

/**
 * A frame Metro couldn't map comes back *echoed*, not blanked: the bundle URL still in `file`, a null
 * position, and `collapse: true` regardless of what the frame is. So a null line means unmapped, and
 * the raw frame has to win — it at least still carries its bundle position, and honouring that
 * blanket `collapse` would hide an app frame behind the toggle.
 */
function toStackFrame(raw: RawFrame, fallback: StackFrame): StackFrame {
  const file = typeof raw.file === 'string' ? raw.file : '';
  const line = typeof raw.lineNumber === 'number' ? raw.lineNumber : undefined;
  // Source-map lines are 1-based, so a zero is the echo of the `0` we send for a positionless frame
  // — `native` and friends come back that way, and `native:0:0` is worse than `native`.
  if (file.length === 0 || line === undefined || line <= 0) return fallback;

  const column = typeof raw.column === 'number' ? raw.column : undefined;
  const location = column === undefined ? `${file}:${line}` : `${file}:${line}:${column}`;

  return {
    fn:
      typeof raw.methodName === 'string' && raw.methodName.length > 0
        ? raw.methodName
        : fallback.fn,
    location,
    // Metro marks the frames its own config considers uninteresting — node_modules and the RN
    // runtime — which is a better answer than our path heuristic, so it wins when present.
    vendor: raw.collapse === true || isVendorLocation(location),
  };
}

function toCodeFrame(raw: unknown): CrashCodeFrame | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { content, fileName, location } = raw as Record<string, unknown>;
  if (typeof content !== 'string' || content.length === 0) return null;

  const position =
    typeof location === 'object' && location !== null
      ? (location as Record<string, unknown>)
      : undefined;
  const row = typeof position?.row === 'number' ? position.row : undefined;
  const column = typeof position?.column === 'number' ? position.column : undefined;

  return {
    // Metro colours the frame with ANSI escapes for a terminal; here they would render as literal
    // `[0m` noise, and the `>` marker carries the same information.
    content: content.replace(ANSI_ESCAPE, ''),
    fileName: typeof fileName === 'string' ? fileName : '',
    location: row === undefined ? null : { row, column: column ?? 0 },
  };
}

type SymbolicatedRequest = {
  frames: StackFrame[];
  codeFrame: CrashCodeFrame | null;
};

async function requestSymbolication(
  origin: string,
  frames: StackFrame[]
): Promise<SymbolicatedRequest | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await getUnpatchedFetch()(`${origin}/symbolicate`, {
      method: 'POST',
      body: JSON.stringify({ stack: frames.map(toRequestFrame) }),
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (typeof payload !== 'object' || payload === null) return null;

    const { stack, codeFrame } = payload as Record<string, unknown>;
    if (!Array.isArray(stack)) return null;

    return {
      frames: frames.map((frame, index) => toStackFrame((stack[index] ?? {}) as RawFrame, frame)),
      codeFrame: toCodeFrame(codeFrame),
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * The error stack and the component stack are separate requests because Metro answers with one code
 * frame per request — the first mappable frame of whatever it was given. Two requests is also what
 * LogBox does, and it is what produces its second source: where it threw, and which element rendered
 * it.
 */
async function symbolicateBothStacks(
  origin: string,
  frames: StackFrame[],
  componentFrames: StackFrame[]
): Promise<SymbolicatedStack | null> {
  const [primary, component] = await Promise.all([
    frames.length > 0 ? requestSymbolication(origin, frames) : null,
    componentFrames.length > 0 ? requestSymbolication(origin, componentFrames) : null,
  ]);

  if (primary === null && component === null) return null;

  const codeFrames = [primary?.codeFrame, component?.codeFrame].filter(
    (codeFrame, index, all): codeFrame is CrashCodeFrame =>
      // The same content twice says nothing twice: a component that threw in its own render answers
      // both requests with one snippet.
      codeFrame != null && all.findIndex((other) => other?.content === codeFrame.content) === index
  );

  return {
    frames: primary?.frames ?? frames,
    componentFrames: component?.frames ?? componentFrames,
    codeFrames,
  };
}

/**
 * Cached per record: the answer can't change for a stack that already happened, and the sheet is
 * mounted and unmounted every time a report is opened. A failure isn't cached — the dev server may
 * simply have been restarting.
 */
export function symbolicateStack(
  recordId: string,
  frames: StackFrame[],
  componentFrames: StackFrame[] = []
): Promise<SymbolicatedStack | null> {
  const done = results.get(recordId);
  if (done) return Promise.resolve(done);

  const pending = inFlight.get(recordId);
  if (pending) return pending;

  const origin = findDevServerOrigin([...frames, ...componentFrames]);
  if (origin === null) return Promise.resolve(null);

  const request = symbolicateBothStacks(origin, frames, componentFrames)
    .catch(() => null)
    .then((result) => {
      inFlight.delete(recordId);
      if (result) results.set(recordId, result);
      return result;
    });

  inFlight.set(recordId, request);
  return request;
}

/** Test-only; the cache is otherwise per-process, like the records it keys off. */
export function resetSymbolication() {
  inFlight.clear();
  results.clear();
}
