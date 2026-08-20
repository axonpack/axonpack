import { collectBreadcrumbs } from './collect-breadcrumbs.service';
import { readDeviceInfo } from './device-info.service';
import { persistCrashRecord } from './native-crash.service';
import {
  crashStore,
  type CrashKind,
  type CrashNativeDetail,
  type CrashRecord,
} from '../../stores/crash/crash.store';

export type CrashCaptureOptions = {
  /**
   * Whether the JavaScript tiers are recorded at all — JS errors, unhandled rejections and render
   * errors caught by `DevtoolsErrorBoundary`.
   *
   * False once the devtools are switched off, where the only crash worth putting in front of
   * somebody is one that ends the app. A fatal JS error still gets through: React Native turns it
   * into a native exception on its way to killing the process, so it arrives as `native-exception`.
   */
  jsTiers: boolean;
  breadcrumbs: boolean;
  /** A non-fatal error is visible in the panel this session; persisting it would re-report it. */
  persistNonFatal: boolean;
  redact?: (record: CrashRecord) => CrashRecord | null;
  onCrash?: (record: CrashRecord) => void;
};

const DEFAULT_OPTIONS: CrashCaptureOptions = {
  jsTiers: true,
  breadcrumbs: true,
  persistNonFatal: false,
};

let options: CrashCaptureOptions = DEFAULT_OPTIONS;
let context: Record<string, unknown> = {};
let sequence = 0;

/**
 * A capture that throws would be handled by the very handler that called it. The flag is a plain
 * boolean rather than a counter because the recursive case is exactly one level deep: the second
 * entry is the one to drop.
 */
let capturing = false;

export function configureCrashCapture(next: Partial<CrashCaptureOptions>) {
  options = { ...DEFAULT_OPTIONS, ...next };
}

/** Extra keys attached to every record from here on — user id, feature flags, current route. */
export function setCrashContext(next: Record<string, unknown> | null) {
  context = next ?? {};
}

function nextId(): string {
  sequence += 1;
  return `crash-${Date.now()}-${sequence}`;
}

function describe(error: unknown): { name: string; message: string; stack: string | null } {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message,
      stack: error.stack ?? null,
    };
  }
  if (typeof error === 'string') return { name: 'Error', message: error, stack: null };
  try {
    return { name: 'Error', message: JSON.stringify(error) ?? String(error), stack: null };
  } catch {
    return { name: 'Error', message: String(error), stack: null };
  }
}

function isFatalKind(kind: CrashKind): boolean {
  return kind === 'js-fatal' || kind === 'native-exception';
}

export function captureCrash(
  error: unknown,
  kind: CrashKind,
  extra?: { componentStack?: string | null; native?: CrashNativeDetail }
): CrashRecord | null {
  if (!crashStore.isEnabled()) return null;
  if (!options.jsTiers && kind !== 'native-exception') return null;
  if (capturing) return null;

  capturing = true;
  try {
    const described = describe(error);
    const draft: CrashRecord = {
      id: nextId(),
      kind,
      ...described,
      componentStack: extra?.componentStack ?? null,
      native: extra?.native,
      fromPreviousLaunch: false,
      timestamp: Date.now(),
      device: readDeviceInfo(),
      breadcrumbs: options.breadcrumbs ? collectBreadcrumbs() : undefined,
      context: Object.keys(context).length > 0 ? { ...context } : undefined,
      seen: false,
    };

    // Runs before anything leaves the process — the store, the disk and `onCrash` all see the
    // redacted record, so there is no ordering in which the raw one escapes.
    const record = options.redact ? options.redact(draft) : draft;
    if (record === null) return null;

    crashStore.add(record);

    if (isFatalKind(kind) || options.persistNonFatal) persistCrashRecord(record);

    try {
      options.onCrash?.(record);
    } catch {
      // The consumer's reporting hook is not allowed to take down the crash handler.
    }

    return record;
  } catch {
    return null;
  } finally {
    capturing = false;
  }
}

/**
 * Records written by an earlier run of the app. They arrive already-persisted and already-redacted
 * (redaction ran before they were written), so they skip both here.
 */
export function adoptPersistedCrash(partial: Partial<CrashRecord>): CrashRecord | null {
  if (!crashStore.isEnabled()) return null;

  const record: CrashRecord = {
    id: partial.id ?? nextId(),
    kind: partial.kind ?? 'native-exception',
    name: partial.name ?? 'Error',
    message: partial.message ?? '',
    stack: partial.stack ?? null,
    componentStack: partial.componentStack ?? null,
    native: partial.native,
    fromPreviousLaunch: true,
    timestamp: partial.timestamp ?? Date.now(),
    device: partial.device,
    breadcrumbs: partial.breadcrumbs,
    context: partial.context,
    seen: false,
  };

  crashStore.add(record);
  return record;
}

/** Test-only; the options are otherwise set once by `init()`. */
export function resetCrashCapture() {
  options = DEFAULT_OPTIONS;
  context = {};
  capturing = false;
}
