import type { StartupTiming } from '../../../features/performance/stores/performance.store';
import { diffMs, formatMs } from '../../../features/performance/utils/format-metrics.util';

type Row = [label: string, value: number | undefined];

function rows(entries: Row[]) {
  return entries.map(([label, value]) => (
    <div key={label} className="axonpack-perf-row">
      <span className="axonpack-perf-muted">{label}</span>
      <strong>{formatMs(value)}</strong>
    </div>
  ));
}

export function Startup({ startup }: { startup?: StartupTiming }) {
  const measured =
    startup?.processStart !== undefined && startup.firstRender !== undefined ? startup : undefined;
  const platform =
    startup !== undefined &&
    (startup.startTime !== undefined ||
      startup.endTime !== undefined ||
      startup.initializeRuntimeStart !== undefined ||
      startup.executeJavaScriptBundleEntryPointStart !== undefined)
      ? startup
      : undefined;

  if (measured === undefined && platform === undefined) return null;

  return (
    <details open className="axonpack-net-section">
      <summary>Startup</summary>
      <div className="axonpack-perf-startup">
        {measured ? (
          <>
            {rows([
              ['Total', diffMs(measured.processStart, measured.firstRender)],
              ['Native startup', diffMs(measured.processStart, measured.nativeModuleInit)],
              ['Bundle eval', diffMs(measured.nativeModuleInit, measured.jsBundleEval)],
              ['App setup', diffMs(measured.jsBundleEval, measured.devtoolsStart)],
              ['To first render', diffMs(measured.devtoolsStart, measured.firstRender)],
            ])}
            <p className="axonpack-perf-note">
              Process start to first render, measured once at launch. The phase boundaries are where
              this package loads, so they move a little with your import order.
            </p>
          </>
        ) : null}

        {platform ? (
          <>
            {measured ? <h4>Reported by the platform</h4> : null}
            {rows([
              ['Total', diffMs(platform.startTime, platform.endTime)],
              ['Native init', diffMs(platform.startTime, platform.initializeRuntimeStart)],
              [
                'Runtime setup',
                diffMs(
                  platform.initializeRuntimeStart,
                  platform.executeJavaScriptBundleEntryPointStart
                ),
              ],
              [
                'Bundle eval',
                diffMs(platform.executeJavaScriptBundleEntryPointStart, platform.endTime),
              ],
            ])}
            {measured ? null : (
              <p className="axonpack-perf-note">
                A dash means the platform did not report that marker.
              </p>
            )}
          </>
        ) : null}
      </div>
    </details>
  );
}
