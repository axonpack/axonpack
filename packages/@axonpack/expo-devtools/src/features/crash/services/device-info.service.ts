import { Platform } from 'react-native';

import { readNativeDeviceInfo } from './native-crash.service';
import type { CrashDeviceInfo } from '../stores/crash.store';

type HermesHost = {
  HermesInternal?: {
    getRuntimeProperties?: () => Record<string, string>;
  };
};

/**
 * Read once and reused for every record. None of it changes while the process lives, and a crash
 * handler is the wrong place to be crossing the bridge four times.
 */
let cached: CrashDeviceInfo | null = null;

function readJsEngine(): { jsEngine?: string } {
  const hermes = (globalThis as HermesHost).HermesInternal;
  if (!hermes) return { jsEngine: 'jsc' };
  try {
    const properties = hermes.getRuntimeProperties?.() ?? {};
    const version = properties['OSS Release Version'];
    return { jsEngine: version ? `hermes ${version}` : 'hermes' };
  } catch {
    return { jsEngine: 'hermes' };
  }
}

export function readDeviceInfo(): CrashDeviceInfo {
  if (cached) return cached;
  cached = {
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    ...readJsEngine(),
    ...readNativeDeviceInfo(),
  };
  return cached;
}

/** Test-only: the cache is otherwise process-lifetime by design. */
export function resetDeviceInfoCache() {
  cached = null;
}
