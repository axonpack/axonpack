import { requireOptionalNativeModule } from 'expo';

import type { CrashDeviceInfo, CrashRecord } from '../../stores/crash/crash.store';

/**
 * The crash file is written by the native handler on the dying thread and drained here on the next
 * launch. It has to be native: a process taken down by an uncaught Java or Objective-C exception
 * gives JavaScript no turn to run, so anything persisted from JS would be persisted too late.
 *
 * Keeping it native also preserves this package's rule of depending on no storage library — the
 * records live in the app's own sandbox, written by the module that is already here.
 */
type CrashNativeModule = {
  installCrashHandler: () => void;
  /** One JSON document per crash, oldest first. Draining is destructive by design. */
  drainPendingCrashes: () => string[];
  /** Used for JS fatals, which may be followed by the process going down before anyone sees them. */
  persistCrashRecord: (json: string) => void;
  getDeviceInfo: () => Partial<CrashDeviceInfo>;
};

const native = requireOptionalNativeModule<CrashNativeModule>('AxonpackDevtools');

export function isNativeCrashCaptureAvailable(): boolean {
  return native != null && typeof native.installCrashHandler === 'function';
}

export function installNativeCrashHandler() {
  if (!isNativeCrashCaptureAvailable()) return;
  try {
    native?.installCrashHandler();
  } catch {
    // A dev client built against an older version of this module won't have the function; the JS
    // handlers still work, so this is a missing tier rather than a failure.
  }
}

/**
 * Shape-checked rather than trusted: the file is JSON written by an earlier build of the app, which
 * may not be the build reading it.
 */
export function drainNativeCrashRecords(): Partial<CrashRecord>[] {
  if (native == null) return [];
  try {
    return native
      .drainPendingCrashes()
      .map((document) => {
        try {
          const parsed: unknown = JSON.parse(document);
          return typeof parsed === 'object' && parsed !== null
            ? (parsed as Partial<CrashRecord>)
            : null;
        } catch {
          return null;
        }
      })
      .filter((record): record is Partial<CrashRecord> => record !== null);
  } catch {
    return [];
  }
}

export function persistCrashRecord(record: CrashRecord) {
  if (native == null) return;
  try {
    native.persistCrashRecord(JSON.stringify(record));
  } catch {
    // Nothing to fall back to, and a crash report is not worth throwing over.
  }
}

export function readNativeDeviceInfo(): Partial<CrashDeviceInfo> {
  if (native == null) return {};
  try {
    return native.getDeviceInfo() ?? {};
  } catch {
    return {};
  }
}
