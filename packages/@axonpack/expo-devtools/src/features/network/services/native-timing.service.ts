import { requireOptionalNativeModule } from 'expo';

import { networkLogStore, type NetworkPhases } from '../stores/network-log.store';
import { matchNativeTiming, type NativeTimingReport } from '../utils/match-native-timing.util';

/**
 * The phases inside a request — queueing, DNS, TCP, TLS — are measured by the platform's own HTTP
 * stack and by nothing above it. React Native's `PerformanceResourceTiming` looks like the JS answer
 * and is not: it stamps every one of those fields from the same three instants a patch can already
 * see. So the readings come from native, where `URLSessionTaskTransactionMetrics` and OkHttp's
 * `EventListener` report the phases as they actually happen.
 *
 * Optional, like every native tier here: without the module — Expo Go, or an older build of it — the
 * tab keeps the two numbers the patches measure and says the phases were not reported.
 */
type TimingNativeModule = {
  installNetworkTimingReporter: () => boolean;
  addListener: (
    event: 'onNetworkPhases',
    listener: (payload: NativeTimingPayload) => void
  ) => { remove: () => void };
};

/** What the native side sends. Every phase may be absent, since each comes from its own callback. */
export type NativeTimingPayload = {
  url: string;
  startMs: number;
  queuedMs?: number | null;
  dnsMs?: number | null;
  tcpMs?: number | null;
  tlsMs?: number | null;
  sendMs?: number | null;
  waitMs?: number | null;
  downloadMs?: number | null;
  totalMs?: number | null;
  /** A `Bool` from Swift, a `Boolean` from Kotlin — either can arrive over the bridge as a number. */
  reusedConnection?: boolean | number | null;
  protocol?: string | null;
  /** Counted on the socket and after decoding — the pair no JS patch can tell apart. */
  wireBytes?: number | null;
  decodedBytes?: number | null;
  measuredBy: NetworkPhases['measuredBy'];
};

const native = requireOptionalNativeModule<TimingNativeModule>('AxonpackDevtools');

let subscription: { remove: () => void } | null = null;
/** Set once the native side confirms it hooked the stack, which is what the tab reports on. */
let reporting = false;

export function isNativePhaseTimingAvailable(): boolean {
  return native != null && typeof native.installNetworkTimingReporter === 'function';
}

/** Whether phases are actually being reported, as opposed to merely being implemented here. */
export function isNativePhaseTimingActive(): boolean {
  return reporting;
}

/** Dropped rather than sent as zero: a phase the platform did not report is not a phase of length 0. */
function present(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function toPhases(payload: NativeTimingPayload): NetworkPhases {
  return {
    queuedMs: present(payload.queuedMs),
    dnsMs: present(payload.dnsMs),
    tcpMs: present(payload.tcpMs),
    tlsMs: present(payload.tlsMs),
    sendMs: present(payload.sendMs),
    waitMs: present(payload.waitMs),
    downloadMs: present(payload.downloadMs),
    totalMs: present(payload.totalMs),
    // Coerced, not passed through: a Swift `Bool` arrives over the bridge as 0 or 1, and `=== true`
    // in the UI is false for 1 — which silently cost the "connection reused" badge on every row.
    reusedConnection:
      payload.reusedConnection === null || payload.reusedConnection === undefined
        ? undefined
        : Boolean(payload.reusedConnection),
    protocol: payload.protocol ?? undefined,
    measuredBy: payload.measuredBy,
  };
}

/** Exported for the tests, and for the one place the client installs this. */
export function applyNativeTiming(payload: NativeTimingPayload) {
  const report: NativeTimingReport = {
    url: payload.url,
    startMs: payload.startMs,
    phases: toPhases(payload),
  };

  const entry = matchNativeTiming(report, networkLogStore.getSnapshot());
  // A reading with no row is dropped, not stored for later: the stack reports every request the app
  // makes, including the ones made before recording started and the panel's own.
  if (!entry) return;

  const wireBytes = present(payload.wireBytes);
  const decodedBytes = present(payload.decodedBytes);

  networkLogStore.update(entry.id, {
    phases: report.phases,
    // Left off entirely when neither count arrived, so the entry never carries an empty object that
    // reads as "measured, and both zero".
    ...(wireBytes === undefined && decodedBytes === undefined
      ? null
      : { transfer: { wireBytes, decodedBytes } }),
  });
}

export function installNativeTimingReporter() {
  if (!isNativePhaseTimingAvailable() || subscription !== null) return;

  try {
    reporting = native?.installNetworkTimingReporter() === true;
  } catch {
    // A dev client built against an older version of this module has no such function.
    reporting = false;
  }
  if (!reporting) return;

  subscription = native?.addListener('onNetworkPhases', applyNativeTiming) ?? null;
}

/** Test-only. */
export function resetNativeTimingReporter() {
  subscription?.remove();
  subscription = null;
  reporting = false;
}
