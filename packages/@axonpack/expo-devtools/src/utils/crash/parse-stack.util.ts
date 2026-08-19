export type StackFrame = {
  /** The function name, or `'<anonymous>'` when the engine didn't record one. */
  fn: string;
  location: string;
  /** Frames inside `node_modules` or the RN runtime — dimmed, since they're rarely the cause. */
  vendor: boolean;
};

const V8_FRAME = /^\s*at\s+(?:(.+?)\s+\()?(.+?)\)?$/;
const SPIDERMONKEY_FRAME = /^(.*?)@(.+)$/;

const VENDOR_PATTERNS = [
  'node_modules',
  '/react-native/Libraries/',
  'InternalBytecode',
  '[native code]',
];

function isVendor(location: string): boolean {
  return VENDOR_PATTERNS.some((pattern) => location.includes(pattern));
}

/**
 * Hermes writes V8-shaped frames and JavaScriptCore writes SpiderMonkey-shaped ones, and a release
 * bundle can carry either depending on how it was built — so both are parsed rather than picking one
 * by platform. A line that matches neither is kept verbatim: an unparsed frame is still evidence,
 * and dropping it would silently shorten the trace.
 */
export function parseStack(stack: string | null): StackFrame[] {
  if (!stack) return [];

  return stack
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^\w*Error\b/.test(line))
    .map((line) => {
      const v8 = V8_FRAME.exec(line);
      if (v8) {
        const location = v8[2] ?? line;
        return { fn: v8[1] ?? '<anonymous>', location, vendor: isVendor(location) };
      }

      const spiderMonkey = SPIDERMONKEY_FRAME.exec(line);
      if (spiderMonkey) {
        const location = spiderMonkey[2] ?? line;
        return {
          fn: spiderMonkey[1] || '<anonymous>',
          location,
          vendor: isVendor(location),
        };
      }

      return { fn: line, location: '', vendor: isVendor(line) };
    });
}

/**
 * React's component stack is a different shape from an error stack — `\n    in Foo (at Bar.tsx:12)`
 * — so it gets its own parser rather than being forced through the one above.
 */
export function parseComponentStack(componentStack: string | null | undefined): StackFrame[] {
  if (!componentStack) return [];

  return componentStack
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const match = /^in\s+(.+?)(?:\s+\(at\s+(.+?)\))?$/.exec(line);
      if (!match) return { fn: line, location: '', vendor: false };
      const location = match[2] ?? '';
      return { fn: match[1] ?? line, location, vendor: isVendor(location) };
    });
}
