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

/** Exported for symbolication, which re-classifies frames once Metro has given them real paths. */
export function isVendorLocation(location: string): boolean {
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
        return { fn: v8[1] ?? '<anonymous>', location, vendor: isVendorLocation(location) };
      }

      const spiderMonkey = SPIDERMONKEY_FRAME.exec(line);
      if (spiderMonkey) {
        const location = spiderMonkey[2] ?? line;
        return {
          fn: spiderMonkey[1] || '<anonymous>',
          location,
          vendor: isVendorLocation(location),
        };
      }

      return { fn: line, location: '', vendor: isVendorLocation(line) };
    });
}

const LEGACY_COMPONENT_FRAME = /^in\s+(.+?)(?:\s+\(at\s+(.+?)\))?$/;

/**
 * React 19 writes a component stack in the *same* shape as an error stack — `at Foo (bundle:1:2)` —
 * which is what makes it symbolicable; React 18 wrote `in Foo (at Bar.tsx:12)`. React Native's own
 * parser now just forwards to its error-stack parser for that reason. Both shapes still turn up, so
 * the legacy one is tried per line and everything else goes through the parser above — which is also
 * what gives these frames a real `location` for symbolication to replace.
 */
export function parseComponentStack(componentStack: string | null | undefined): StackFrame[] {
  if (!componentStack) return [];

  return componentStack
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line) => {
      const legacy = LEGACY_COMPONENT_FRAME.exec(line);
      if (legacy) {
        const location = legacy[2] ?? '';
        return [{ fn: legacy[1] ?? line, location, vendor: isVendorLocation(location) }];
      }
      return parseStack(line);
    });
}
